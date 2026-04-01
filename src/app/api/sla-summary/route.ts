import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { and, asc, count, sql, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');

    // Filtro de data usando COALESCE(aberturaAt, finalizacaoAt, createdAt)
    // mantém semântica idêntica ao $or original do MongoDB
    const filters: SQL[] = [];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
      if (fromStr) filters.push(sql`${dataRef} >= ${new Date(fromStr)}`);
      if (toStr)   filters.push(sql`${dataRef} <= ${new Date(toStr)}`);
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const summaryRaw = await db
      .select({
        periodYear:       atendimentos.periodYear,
        periodMonth:      atendimentos.periodMonth,
        activityType:     atendimentos.tipo,
        slaTargetHours:   atendimentos.slaHoras,
        total:            count(),
        concluded:        sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        withinSlaCorrido: sql<number>`cast(sum(case when ${atendimentos.dentroSla} = true then 1 else 0 end) as int)`,
        withinSlaUtil:    sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(
        atendimentos.periodYear,
        atendimentos.periodMonth,
        atendimentos.tipo,
        atendimentos.slaHoras,
      )
      .orderBy(asc(atendimentos.periodYear), asc(atendimentos.periodMonth));

    const data = summaryRaw.map((s) => ({
      periodYear:       s.periodYear,
      periodMonth:      s.periodMonth,
      activityType:     s.activityType,
      slaTargetHours:   s.slaTargetHours != null ? Number(s.slaTargetHours) : null,
      total:            s.total,
      concluded:        s.concluded,
      withinSlaCorrido: s.withinSlaCorrido,
      withinSlaUtil:    s.withinSlaUtil,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[sla-summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
