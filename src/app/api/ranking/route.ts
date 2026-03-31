import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, technicians } from '@/lib/db/schema';
import { count, sql, eq, desc, and, gte, lte } from 'drizzle-orm';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const pf = [];
    if (fromStr) pf.push(gte(atendimentos.aberturaAt, new Date(fromStr)));
    if (toStr) pf.push(lte(atendimentos.aberturaAt, new Date(toStr)));

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
      .where(and(...pf))
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

    return NextResponse.json({ ranking: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
