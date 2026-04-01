import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, qualityRecords } from '@/lib/db/schema';
import { calculateValidAverage } from '@/lib/utils/average';
import { sql, and, count, gte, lte } from 'drizzle-orm';
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

    const pf = [];
    if (fromStr) pf.push(gte(dataRef, new Date(fromStr)));
    if (toStr) pf.push(lte(dataRef, new Date(toStr)));

    const [totalResult] = await db
      .select({ total: count() })
      .from(atendimentos)
      .where(and(...pf));

    const slaByType = await db
      .select({
        activityType:      atendimentos.tipo,
        total:             count(),
        concluded:         sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
        withinSlaCorrido:  sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.dentroSla} = true)`,
        withinSlaUtil:     sql<number>`COUNT(*) FILTER (WHERE ${atendimentos.dentroSlaUtil} = true)`,
        avgCorridoSeconds: sql<number>`AVG(${atendimentos.slaCorridoSegundos}) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
        avgUtilSeconds:    sql<number>`AVG(${atendimentos.slaUtilSegundos}) FILTER (WHERE ${atendimentos.finalizacaoAt} IS NOT NULL)`,
        slaTargetHours:    atendimentos.slaHoras,
      })
      .from(atendimentos)
      .where(and(...pf))
      .groupBy(atendimentos.tipo, atendimentos.slaHoras);

    const qf = [];
    if (fromStr) qf.push(gte(qualityRecords.openedAt, new Date(fromStr)));
    if (toStr) qf.push(lte(qualityRecords.openedAt, new Date(toStr)));
    const qualityIndicators = await db
      .select({ indicator: qualityRecords.indicator, total: count() })
      .from(qualityRecords)
      .where(and(...qf))
      .groupBy(qualityRecords.indicator);

    const slaByTypeWithPercent = slaByType.map((t) => ({
      ...t,
      slaUtilPercent: Number(t.concluded) > 0 ? Number(t.withinSlaUtil) / Number(t.concluded) : 0,
      slaCorridoPercent: Number(t.concluded) > 0 ? Number(t.withinSlaCorrido) / Number(t.concluded) : 0,
    }));

    return NextResponse.json({
      totalAtendimentos: totalResult.total,
      slaUtilGeral: calculateValidAverage(slaByTypeWithPercent.map((t) => t.slaUtilPercent)),
      slaCorridoGeral: calculateValidAverage(slaByTypeWithPercent.map((t) => t.slaCorridoPercent)),
      metaSLA: 0.95,
      slaByType: slaByTypeWithPercent,
      qualityIndicators,
    });
  } catch (err) {
    console.error('[dashboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
