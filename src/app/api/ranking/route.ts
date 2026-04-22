import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { and, count, eq, isNotNull, sql, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

const EXCLUDED_TECHNICIAN_NAMES = new Set([
  'Andre Phylipe',
  'Davi Borges',
  'Hyan Levi',
  'Kaique Pinheiro',
  'Valdir Rocha',
  'Arthur Alves',
  'Luiz Amorim',
  'Pedro Nascimento',
  'Leonardo Khalil',
  'Guilherme Santos',
  'Patrick Kretli',
  'Keven Miranda',
  'Davi Guimaraes',
]);

function canonicalizeTechnicianName(name: string | null | undefined) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toDisplayTechnicianName(name: string | null | undefined) {
  const canonical = canonicalizeTechnicianName(name);
  if (!canonical) return '';
  if (canonical === 'lucas mendonca') return 'Lucas Mendonca';

  return canonical
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isExcludedTechnicianName(name: string | null | undefined) {
  return EXCLUDED_TECHNICIAN_NAMES.has(toDisplayTechnicianName(name));
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'ranking.view', {
    moduleSlug: 'ranking',
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
    const dateFilters: SQL[] = [eq(atendimentos.workspaceId, result.context.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
      if (fromStr) dateFilters.push(sql`${dataRef} >= ${new Date(fromStr)}`);
      if (toStr)   dateFilters.push(sql`${dataRef} <= ${new Date(toStr)}`);
    }

    const baseWhere = dateFilters.length ? and(...dateFilters) : undefined;

    // Técnicos excluídos do ranking (não contabilizar)
    const EXCLUDED_FIRST_NAMES = ['Fernanda', 'Vitor', 'Ramon', 'Thiago'];
    const excludedFilter = sql`split_part(${atendimentos.tecnico}, ' ', 1) NOT IN (${sql.join(EXCLUDED_FIRST_NAMES.map((n) => sql`${n}`), sql`, `)})`;

    // Ranking: só técnicos vinculados (tecnicoId NOT NULL) e não excluídos
    const rankingFilters: SQL[] = [...dateFilters, isNotNull(atendimentos.tecnicoId), excludedFilter];
    if (city && city !== 'all') rankingFilters.push(eq(atendimentos.cidade, city));
    const rankingWhere = and(...rankingFilters);

    const [citiesRaw, rankingRaw] = await Promise.all([
      // Cidades distintas no período base
      db
        .selectDistinct({ cidade: atendimentos.cidade })
        .from(atendimentos)
        .where(baseWhere),

      // Ranking agregado por técnico
      db
        .select({
          tecnicoId:    atendimentos.tecnicoId,
          tecnico:      atendimentos.tecnico,
          totalOS:      count(),
          instNova:     sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Instalação (Nova)' then 1 else 0 end) as int)`,
          instReativ:   sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Instalação (Reativação)' then 1 else 0 end) as int)`,
          reparo:       sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Reparo' then 1 else 0 end) as int)`,
          mudEndereco:  sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Mudança de Endereço' then 1 else 0 end) as int)`,
          retiradaKit:  sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Retirada de Kit' then 1 else 0 end) as int)`,
          mudPlano:     sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Mudança de Plano' then 1 else 0 end) as int)`,
          retorno:      sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Retorno' then 1 else 0 end) as int)`,
          withinSlaUtil:sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
          concluded:    sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
          avgSlaUtilSeg:sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaUtilSegundos} else null end)`,
        })
        .from(atendimentos)
        .where(rankingWhere)
        .groupBy(atendimentos.tecnicoId, atendimentos.tecnico)
        .orderBy(sql`count(*) desc`),
    ]);

    const rankingMerged = Array.from(
      rankingRaw.reduce<
        Map<number, {
          technicianId: number;
          technicianName: string;
          totalOS: number;
          instNova: number;
          instReativacao: number;
          reparo: number;
          mudancaEndereco: number;
          retiradaKit: number;
          mudancaPlano: number;
          retorno: number;
          withinSlaUtil: number;
          concluded: number;
          avgSlaUtilWeightedTotal: number;
        }>
      >((acc, row) => {
        const technicianId = Number(row.tecnicoId ?? 0);
        if (!technicianId) return acc;

        const technicianName = toDisplayTechnicianName(row.tecnico);
        if (!technicianName || isExcludedTechnicianName(technicianName)) return acc;

        const current = acc.get(technicianId) ?? {
          technicianId,
          technicianName,
          totalOS: 0,
          instNova: 0,
          instReativacao: 0,
          reparo: 0,
          mudancaEndereco: 0,
          retiradaKit: 0,
          mudancaPlano: 0,
          retorno: 0,
          withinSlaUtil: 0,
          concluded: 0,
          avgSlaUtilWeightedTotal: 0,
        };

        current.technicianName = current.technicianName.length >= technicianName.length
          ? current.technicianName
          : technicianName;
        current.totalOS += Number(row.totalOS ?? 0);
        current.instNova += Number(row.instNova ?? 0);
        current.instReativacao += Number(row.instReativ ?? 0);
        current.reparo += Number(row.reparo ?? 0);
        current.mudancaEndereco += Number(row.mudEndereco ?? 0);
        current.retiradaKit += Number(row.retiradaKit ?? 0);
        current.mudancaPlano += Number(row.mudPlano ?? 0);
        current.retorno += Number(row.retorno ?? 0);
        current.withinSlaUtil += Number(row.withinSlaUtil ?? 0);
        current.concluded += Number(row.concluded ?? 0);
        current.avgSlaUtilWeightedTotal += (Number(row.avgSlaUtilSeg) || 0) * Number(row.concluded ?? 0);
        acc.set(technicianId, current);
        return acc;
      }, new Map()).values()
    )
      .sort((left, right) => right.totalOS - left.totalOS || left.technicianName.localeCompare(right.technicianName));

    const ranking = rankingMerged.map((r, i) => ({
      position: i + 1,
      technicianId: r.technicianId,
      technicianName: r.technicianName,
      totalOS: r.totalOS,
      instNova: r.instNova,
      instReativacao: r.instReativacao,
      reparo: r.reparo,
      mudancaEndereco: r.mudancaEndereco,
      retiradaKit: r.retiradaKit,
      mudancaPlano: r.mudancaPlano,
      retorno: r.retorno,
      withinSlaUtil: r.withinSlaUtil,
      concluded: r.concluded,
      avgSlaUtilFormatted: formatSecondsToHHMMSS(
        Math.floor(r.concluded > 0 ? r.avgSlaUtilWeightedTotal / r.concluded : 0)
      ),
      slaUtilPercent: r.concluded > 0
        ? Math.round((r.withinSlaUtil / r.concluded) * 100)
        : null,
      isTop5: i < 5,
    }));

    return NextResponse.json({
      ranking,
      cities: citiesRaw
        .map((r) => r.cidade)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    console.error('[ranking]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
