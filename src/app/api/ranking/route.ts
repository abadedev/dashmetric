import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, technicians } from '@/lib/db/schema';
import { count, sql, eq, desc, and, gte, lte } from 'drizzle-orm';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const city = searchParams.get('city');
    const dataRef = sql<Date>`coalesce(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;

    const baseFilters = [];
    if (fromStr) baseFilters.push(gte(dataRef, new Date(fromStr)));
    if (toStr) baseFilters.push(lte(dataRef, new Date(toStr)));

    const rankingFilters = [...baseFilters];
    if (city && city !== 'all') rankingFilters.push(eq(atendimentos.cidade, city));

    const cityRows = await db
      .selectDistinct({ city: atendimentos.cidade })
      .from(atendimentos)
      .where(baseFilters.length ? and(...baseFilters) : undefined);

    const ranking = await db
      .select({
        technicianId:   technicians.id,
        technicianName: technicians.name,
        totalOS:     count(),
        instNova:    sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Instalação (Nova)')`,
        instReativ:  sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Instalação (Reativação)')`,
        reparo:      sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Reparo')`,
        mudEndereco: sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Mudança de Endereço')`,
        retiradaKit: sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Retirada de Kit')`,
        mudPlano:    sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Mudança de Plano')`,
        retorno:     sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.tipo} = 'Retorno')`,
        withinSlaUtil: sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.dentroSlaUtil} = true)`,
        concluded:     sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
        avgSlaUtilSeg: sql<number>`AVG(${atendimentos.slaUtilSegundos}) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
      })
      .from(atendimentos)
      .innerJoin(technicians, eq(atendimentos.tecnicoId, technicians.id))
      .where(rankingFilters.length ? and(...rankingFilters) : undefined)
      .groupBy(technicians.id, technicians.name)
      .orderBy(desc(count()));

    const result = ranking.map((r, i) => ({
      position:        i + 1,
      technicianId:    r.technicianId,
      technicianName:  r.technicianName,
      totalOS:         r.totalOS,
      instNova:        Number(r.instNova),
      instReativacao:  Number(r.instReativ),
      reparo:          Number(r.reparo),
      mudancaEndereco: Number(r.mudEndereco),
      retiradaKit:     Number(r.retiradaKit),
      mudancaPlano:    Number(r.mudPlano),
      retorno:         Number(r.retorno),
      withinSlaUtil:   Number(r.withinSlaUtil),
      concluded:       Number(r.concluded),
        avgSlaUtilFormatted: formatSecondsToHHMMSS(Math.floor(Number(r.avgSlaUtilSeg) || 0)),
      slaUtilPercent: Number(r.concluded) > 0
        ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100)
        : null,
      isTop5: i < 5,
    }));

    return NextResponse.json({
      ranking: result,
      cities: cityRows
        .map((row) => row.city)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => left.localeCompare(right)),
    });
  } catch (err) {
    console.error('[ranking]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
