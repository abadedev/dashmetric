import { NextRequest, NextResponse } from 'next/server';
import { and, countDistinct, desc, eq, gte, lte, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  atendimentos,
  qualityRecords,
  supportRecords,
  infrastructureRecords,
} from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';

export const runtime = 'nodejs';

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function ymd(year: number, monthZeroIdx: number, day: number) {
  return `${year}-${String(monthZeroIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function defaultPeriods() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // zero-indexed
  const lastDayCurrent = new Date(y, m + 1, 0).getDate();
  const lastDayPrev = new Date(y, m, 0).getDate();
  const prevMonthIdx = m === 0 ? 11 : m - 1;
  const prevYear = m === 0 ? y - 1 : y;

  return {
    aFrom: ymd(y, m, 1),
    aTo: ymd(y, m, lastDayCurrent),
    bFrom: ymd(prevYear, prevMonthIdx, 1),
    bTo: ymd(prevYear, prevMonthIdx, lastDayPrev),
  };
}

function buildLabel(fromStr: string, toStr: string): string {
  const fromMatch = fromStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const toMatch = toStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!fromMatch || !toMatch) return `${fromStr} – ${toStr}`;

  const [, fyStr, fmStr, fdStr] = fromMatch;
  const [, tyStr, tmStr, tdStr] = toMatch;
  const fy = Number(fyStr);
  const fm = Number(fmStr);
  const fd = Number(fdStr);
  const ty = Number(tyStr);
  const tm = Number(tmStr);
  const td = Number(tdStr);

  const lastDayOfFromMonth = new Date(fy, fm, 0).getDate();
  if (fd === 1 && fy === ty && fm === tm && td === lastDayOfFromMonth) {
    return `${MONTH_LABELS[fm - 1]}/${String(fy).slice(-2)}`;
  }

  return `${fdStr}/${fmStr} – ${tdStr}/${tmStr}/${String(ty).slice(-2)}`;
}

type SlaRow = {
  total: number;
  concluded: number;
  withinSlaUtil: number;
  slaUtilPercent: number;
};
type AtendByTypeRow = { type: string; total: number };
type AtendRow = {
  total: number;
  reparos: number;
  instalacoes: number;
  emAberto: number;
  byType: AtendByTypeRow[];
};
type QualityRow = { IQIv: number; IQRv: number; ICT: number; RST: number };
type SupportRow = { total: number; agentes: number };
type InfraRow = { total: number; categorias: number; categoriasList: string[] };

async function fetchSla(
  workspaceId: string,
  fromDate: Date,
  toDate: Date
): Promise<SlaRow> {
  const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
  const filters: SQL[] = [
    eq(atendimentos.workspaceId, workspaceId),
    sql`${dataRef} >= ${fromDate}`,
    sql`${dataRef} <= ${toDate}`,
    sql`${atendimentos.slaHoras} is not null`,
  ];

  const [row] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      concluded: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
      withinSlaUtil: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true and ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
    })
    .from(atendimentos)
    .where(and(...filters));

  const total = Number(row?.total ?? 0);
  const concluded = Number(row?.concluded ?? 0);
  const withinSlaUtil = Number(row?.withinSlaUtil ?? 0);
  const slaUtilPercent = concluded > 0 ? (withinSlaUtil / concluded) * 100 : 0;

  return { total, concluded, withinSlaUtil, slaUtilPercent };
}

async function fetchAtendimentos(
  workspaceId: string,
  fromDate: Date,
  toDate: Date
): Promise<AtendRow> {
  const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
  const filters: SQL[] = [
    eq(atendimentos.workspaceId, workspaceId),
    sql`${dataRef} >= ${fromDate}`,
    sql`${dataRef} <= ${toDate}`,
  ];
  const atendWhere = and(...filters);

  const [[row], byTypeRows] = await Promise.all([
    db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        reparos: sql<number>`cast(sum(case when ${atendimentos.tipo} ilike '%reparo%' then 1 else 0 end) as int)`,
        instalacoes: sql<number>`cast(sum(case when (${atendimentos.tipo} ilike '%instalação%' or ${atendimentos.tipo} ilike '%instalacao%') then 1 else 0 end) as int)`,
        emAberto: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is null then 1 else 0 end) as int)`,
      })
      .from(atendimentos)
      .where(atendWhere),
    db
      .select({
        type: sql<string>`coalesce(${atendimentos.tipo}, 'Sem tipo')`,
        total: sql<number>`cast(count(*) as int)`,
      })
      .from(atendimentos)
      .where(atendWhere)
      .groupBy(atendimentos.tipo)
      .orderBy(desc(sql`count(*)`)),
  ]);

  return {
    total: Number(row?.total ?? 0),
    reparos: Number(row?.reparos ?? 0),
    instalacoes: Number(row?.instalacoes ?? 0),
    emAberto: Number(row?.emAberto ?? 0),
    byType: byTypeRows.map((item) => ({
      type: item.type,
      total: Number(item.total ?? 0),
    })),
  };
}

async function fetchQuality(
  workspaceId: string,
  fromDate: Date,
  toDate: Date
): Promise<QualityRow> {
  const rows = await db
    .select({
      indicator: qualityRecords.indicator,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(qualityRecords)
    .where(
      and(
        eq(qualityRecords.workspaceId, workspaceId),
        gte(qualityRecords.openedAt, fromDate),
        lte(qualityRecords.openedAt, toDate)
      )
    )
    .groupBy(qualityRecords.indicator);

  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.indicator] = Number(r.total);
  }

  const IQIv = map['IQIv'] ?? 0;
  const IQRv = map['IQRv'] ?? 0;
  const ICT = map['ICT'] ?? 0;
  return { IQIv, IQRv, ICT, RST: IQIv + IQRv };
}

async function fetchSupport(
  workspaceId: string,
  fromYM: number,
  toYM: number
): Promise<SupportRow> {
  const periodVal = sql<number>`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth}`;
  const [row] = await db
    .select({
      total: sql<number>`cast(coalesce(sum(${supportRecords.total}), 0) as int)`,
      agentes: countDistinct(supportRecords.attendantName),
    })
    .from(supportRecords)
    .where(
      and(
        eq(supportRecords.workspaceId, workspaceId),
        gte(periodVal, fromYM),
        lte(periodVal, toYM)
      )
    );

  return {
    total: Number(row?.total ?? 0),
    agentes: Number(row?.agentes ?? 0),
  };
}

async function fetchInfra(
  workspaceId: string,
  fromDate: Date,
  toDate: Date
): Promise<InfraRow> {
  const fromYM = fromDate.getFullYear() * 100 + (fromDate.getMonth() + 1);
  const toYM = toDate.getFullYear() * 100 + (toDate.getMonth() + 1);
  const baseFilter = and(
    eq(infrastructureRecords.workspaceId, workspaceId),
    sql`(
      (
        ${infrastructureRecords.referenceDate} IS NOT NULL
        AND ${infrastructureRecords.referenceDate} >= ${fromDate}
        AND ${infrastructureRecords.referenceDate} <= ${toDate}
      )
      OR
      (
        ${infrastructureRecords.referenceDate} IS NULL
        AND (
          (${infrastructureRecords.periodYear} * 100 + ${infrastructureRecords.periodMonth})
          BETWEEN ${fromYM} AND ${toYM}
        )
      )
    )`
  );

  const [row] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      categorias: sql<number>`cast(count(distinct ${infrastructureRecords.category}) as int)`,
      categoriasList: sql<string>`string_agg(distinct ${infrastructureRecords.category}, ', ')`,
    })
    .from(infrastructureRecords)
    .where(baseFilter);

  const categoriasList = String(row?.categoriasList ?? '')
    .split(', ')
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return {
    total: Number(row?.total ?? 0),
    categorias: Number(row?.categorias ?? 0),
    categoriasList,
  };
}

function ymStrToInt(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number(m[2]);
}

async function fetchPeriod(workspaceId: string, fromStr: string, toStr: string) {
  const fromDate = parseDateFrom(fromStr);
  const toDate = parseDateTo(toStr);
  const fromYM = ymStrToInt(fromStr);
  const toYM = ymStrToInt(toStr);

  const [sla, atend, quality, support, infra] = await Promise.all([
    fetchSla(workspaceId, fromDate, toDate),
    fetchAtendimentos(workspaceId, fromDate, toDate),
    fetchQuality(workspaceId, fromDate, toDate),
    fetchSupport(workspaceId, fromYM, toYM),
    fetchInfra(workspaceId, fromDate, toDate),
  ]);

  return { sla, atend, quality, support, infra };
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'resumo-sla.view', {
    moduleSlug: 'resumo-sla',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const defaults = defaultPeriods();
    const aFromStr = searchParams.get('aFrom') ?? defaults.aFrom;
    const aToStr = searchParams.get('aTo') ?? defaults.aTo;
    const bFromStr = searchParams.get('bFrom') ?? defaults.bFrom;
    const bToStr = searchParams.get('bTo') ?? defaults.bTo;

    const workspaceId = result.context.workspaceId;

    const [a, b] = await Promise.all([
      fetchPeriod(workspaceId, aFromStr, aToStr),
      fetchPeriod(workspaceId, bFromStr, bToStr),
    ]);

    return NextResponse.json({
      data: {
        periodA: { label: buildLabel(aFromStr, aToStr), from: aFromStr, to: aToStr },
        periodB: { label: buildLabel(bFromStr, bToStr), from: bFromStr, to: bToStr },
        sla: { a: a.sla, b: b.sla },
        atendimentos: { a: a.atend, b: b.atend },
        qualidade: { a: a.quality, b: b.quality },
        suporte: { a: a.support, b: b.support },
        infraestrutura: { a: a.infra, b: b.infra },
      },
    });
  } catch (error) {
    console.error('[comparative-summary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
