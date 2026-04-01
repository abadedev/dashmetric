import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { eq, and, count, sql, gte, lte } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const dataRef = sql<Date>`coalesce(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
    const periodYearExpr = sql<number>`extract(year from ${dataRef})::int`;
    const periodMonthExpr = sql<number>`extract(month from ${dataRef})::int`;

    const pf = [];
    if (fromStr) pf.push(gte(dataRef, new Date(fromStr)));
    if (toStr) pf.push(lte(dataRef, new Date(toStr)));

    const summary = await db
      .select({
        periodYear:       periodYearExpr,
        periodMonth:      periodMonthExpr,
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
        periodYearExpr,
        periodMonthExpr,
        atendimentos.tipo,
        atendimentos.slaHoras,
      )
      .orderBy(periodYearExpr, periodMonthExpr);

    return NextResponse.json({ data: summary });
  } catch (err) {
    console.error('[sla-summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
