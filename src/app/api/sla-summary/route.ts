import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { eq, and, count, sql, gte, lte } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const pf = [];
    if (fromStr) pf.push(gte(atendimentos.aberturaAt, new Date(fromStr)));
    if (toStr) pf.push(lte(atendimentos.aberturaAt, new Date(toStr)));

    const summary = await db
      .select({
        periodYear:       atendimentos.periodYear,
        periodMonth:      atendimentos.periodMonth,
        activityType:     atendimentos.tipo,          // alias para compat. frontend
        total:            count(),
        concluded:        sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
        withinSlaCorrido: sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.dentroSla} = true)`,
        withinSlaUtil:    sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.dentroSlaUtil} = true)`,
        slaTargetHours:   atendimentos.slaHoras,
      })
      .from(atendimentos)
      .where(and(...pf))
      .groupBy(
        atendimentos.periodYear,
        atendimentos.periodMonth,
        atendimentos.tipo,
        atendimentos.slaHoras,
      )
      .orderBy(atendimentos.periodYear, atendimentos.periodMonth);

    return NextResponse.json({ data: summary });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
