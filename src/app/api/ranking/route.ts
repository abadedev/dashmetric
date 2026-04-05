import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { and, count, eq, isNotNull, sql, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');
    const city    = searchParams.get('city');

    // Filtro de data usando COALESCE equivalente ao $or do MongoDB
    const dateFilters: SQL[] = [eq(atendimentos.workspaceId, ctx.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
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

    const ranking = rankingRaw.map((r, i) => ({
      position:           i + 1,
      technicianId:       r.tecnicoId,
      technicianName:     r.tecnico,
      totalOS:            r.totalOS,
      instNova:           r.instNova,
      instReativacao:     r.instReativ,
      reparo:             r.reparo,
      mudancaEndereco:    r.mudEndereco,
      retiradaKit:        r.retiradaKit,
      mudancaPlano:       r.mudPlano,
      retorno:            r.retorno,
      withinSlaUtil:      r.withinSlaUtil,
      concluded:          r.concluded,
      avgSlaUtilFormatted: formatSecondsToHHMMSS(Math.floor(Number(r.avgSlaUtilSeg) || 0)),
      slaUtilPercent: Number(r.concluded) > 0
        ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100)
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
  });
}
