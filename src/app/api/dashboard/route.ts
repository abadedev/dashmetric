import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, qualityRecords } from '@/lib/db/schema';
import { calculateValidAverage } from '@/lib/utils/average';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { and, count, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';
import { SLA_TARGETS } from '@/lib/services/sla-engine';

export const runtime = 'nodejs';

const RETIRADA_META_SECONDS = (SLA_TARGETS.retirada_kit ?? 72) * 3600;

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'dashboard.view', {
    moduleSlug: 'dashboard',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');
    const city    = searchParams.get('city');

    // Filtro de data: prioriza finalizacaoAt; fallback para aberturaAt e createdAt
    const atendFilters: SQL[] = [eq(atendimentos.workspaceId, result.context.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
      if (fromStr) atendFilters.push(sql`${dataRef} >= ${parseDateFrom(fromStr)}`);
      if (toStr)   atendFilters.push(sql`${dataRef} <= ${parseDateTo(toStr)}`);
    }
    if (city && city !== 'all') atendFilters.push(eq(atendimentos.cidade, city));
    const atendWhere = atendFilters.length ? and(...atendFilters) : undefined;

    // Filtro de data para qualidade: usa openedAt com fallback para createdAt
    const qualityFilters: SQL[] = [eq(qualityRecords.workspaceId, result.context.workspaceId)];
    const qDateRef = sql`COALESCE(${qualityRecords.openedAt}, ${qualityRecords.createdAt})`;
    if (fromStr) qualityFilters.push(sql`${qDateRef} >= ${parseDateFrom(fromStr)}`);
    if (toStr)   qualityFilters.push(sql`${qDateRef} <= ${parseDateTo(toStr)}`);
    if (city && city !== 'all') qualityFilters.push(eq(qualityRecords.city, city));
    const qualityWhere = qualityFilters.length ? and(...qualityFilters) : undefined;

    // Filtro de reparos para RTV
    const reparoFilters: SQL[] = [
      eq(atendimentos.workspaceId, result.context.workspaceId),
      ilike(atendimentos.tipo, 'reparo'),
    ];
    if (fromStr) reparoFilters.push(gte(atendimentos.aberturaAt, parseDateFrom(fromStr)));
    if (toStr)   reparoFilters.push(lte(atendimentos.aberturaAt, parseDateTo(toStr)));
    if (city && city !== 'all') reparoFilters.push(eq(atendimentos.cidade, city));
    const reparoWhere = and(...reparoFilters);

    // Cidades distintas para o filtro (escopo: workspace + data, sem filtro de cidade)
    const baseCityFilters: SQL[] = [eq(atendimentos.workspaceId, result.context.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
      if (fromStr) baseCityFilters.push(sql`${dataRef} >= ${parseDateFrom(fromStr)}`);
      if (toStr)   baseCityFilters.push(sql`${dataRef} <= ${parseDateTo(toStr)}`);
    }
    const baseCityWhere = and(...baseCityFilters);

    const [
      [totalRow],
      slaByTypeRaw,
      qualityIndicatorsRaw,
      [reparoRow],
      citiesRaw,
    ] = await Promise.all([
      db.select({ total: count() }).from(atendimentos).where(atendWhere),

      db
        .select({
          tipo:             atendimentos.tipo,
          slaHoras:         atendimentos.slaHoras,
          total:            count(),
          concluded:        sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
          withinSlaCorrido: sql<number>`cast(sum(case
            when ${atendimentos.dentroSla} = true then 1
            when ${atendimentos.tipo} ilike '%retirada%' and ${atendimentos.finalizacaoAt} is not null and ${atendimentos.slaCorridoSegundos} is not null and ${atendimentos.slaCorridoSegundos} <= ${RETIRADA_META_SECONDS} then 1
            else 0 end) as int)`,
          withinSlaUtil:    sql<number>`cast(sum(case
            when ${atendimentos.dentroSlaUtil} = true then 1
            when ${atendimentos.tipo} ilike '%retirada%' and ${atendimentos.finalizacaoAt} is not null and ${atendimentos.slaUtilSegundos} is not null and ${atendimentos.slaUtilSegundos} <= ${RETIRADA_META_SECONDS} then 1
            else 0 end) as int)`,
          avgCorridoSeconds:sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaCorridoSegundos} else null end)`,
          avgUtilSeconds:   sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaUtilSegundos} else null end)`,
        })
        .from(atendimentos)
        .where(atendWhere)
        .groupBy(atendimentos.tipo, atendimentos.slaHoras),

      db
        .select({
          indicator: qualityRecords.indicator,
          total:     count(),
        })
        .from(qualityRecords)
        .where(qualityWhere)
        .groupBy(qualityRecords.indicator),

      db.select({ total: count() }).from(atendimentos).where(reparoWhere),

      db
        .selectDistinct({ cidade: atendimentos.cidade })
        .from(atendimentos)
        .where(baseCityWhere),
    ]);

    const slaByType = slaByTypeRaw.map((t) => {
      const concluded        = Number(t.concluded);
      const withinSlaUtil    = Number(t.withinSlaUtil);
      const withinSlaCorrido = Number(t.withinSlaCorrido);
      return {
        activityType:      t.tipo,
        slaTargetHours:    t.slaHoras != null ? Number(t.slaHoras) : null,
        total:             t.total,
        concluded,
        withinSlaCorrido,
        withinSlaUtil,
        avgCorridoSeconds: Number(t.avgCorridoSeconds) || null,
        avgUtilSeconds:    Number(t.avgUtilSeconds) || null,
        slaUtilPercent:    concluded > 0 ? withinSlaUtil / concluded : 0,
        slaCorridoPercent: concluded > 0 ? withinSlaCorrido / concluded : 0,
      };
    });

    const byIndicator: Record<string, number> = {};
    for (const q of qualityIndicatorsRaw) {
      byIndicator[q.indicator] = q.total;
    }

    const totalReparos = reparoRow?.total ?? 0;

    const qualityIndicators = [
      { indicator: 'IQIv', total: byIndicator['IQIv'] ?? 0 },
      { indicator: 'IQRv', total: byIndicator['IQRv'] ?? 0 },
      { indicator: 'RTV',  total: totalReparos },
      { indicator: 'RST',  total: (byIndicator['IQIv'] ?? 0) + (byIndicator['IQRv'] ?? 0) },
      { indicator: 'ICT',  total: byIndicator['ICT'] ?? 0 },
    ].filter((q) => q.total > 0);

    const tiposParaMetaGeral = slaByType.filter(
      (t) => t.activityType !== 'retirada_kit' && t.activityType !== 'Retirada de Kit'
    );
    const slaCorridoGeral = calculateValidAverage(tiposParaMetaGeral.map((t) => t.slaCorridoPercent));
    const slaUtilGeral = calculateValidAverage(tiposParaMetaGeral.map((t) => t.slaUtilPercent));

    const iqiv = byIndicator['IQIv'] ?? 0;
    const iqrv = byIndicator['IQRv'] ?? 0;
    const inrReparos =
      totalReparos > 0 ? Math.round(((iqiv + iqrv) / totalReparos) * 100 * 100) / 100 : null;

    return NextResponse.json({
      totalAtendimentos: totalRow?.total ?? 0,
      slaGeral:        slaCorridoGeral,
      slaCorridoGeral,
      slaUtilGeral,
      metaSLA: 0.95,
      slaByType,
      qualityIndicators,
      totalReparos,
      byIndicator: { IQIv: iqiv, IQRv: iqrv },
      inrReparos,
      cities: citiesRaw
        .map((r) => r.cidade)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    });
  } catch (err) {
    console.error('[dashboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
