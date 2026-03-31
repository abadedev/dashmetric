import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, qualityRecords } from '@/lib/db/schema';
import { sql, eq, and, count, gte, lte } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const pf = [];
    if (fromStr) pf.push(gte(atendimentos.aberturaAt, new Date(fromStr)));
    if (toStr) pf.push(lte(atendimentos.aberturaAt, new Date(toStr)));

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

    const totalConcluded    = slaByType.reduce((s, t) => s + Number(t.concluded), 0);
    const totalWithinUtil   = slaByType.reduce((s, t) => s + Number(t.withinSlaUtil), 0);
    const totalWithinCorrido= slaByType.reduce((s, t) => s + Number(t.withinSlaCorrido), 0);

    return NextResponse.json({
      totalAtendimentos: totalResult.total,
      slaUtilGeral:    totalConcluded > 0 ? totalWithinUtil    / totalConcluded : 0,
      slaCorridoGeral: totalConcluded > 0 ? totalWithinCorrido / totalConcluded : 0,
      metaSLA: 0.95,
      slaByType: slaByType.map((t) => ({
        ...t,
        slaUtilPercent:    Number(t.concluded) > 0 ? Number(t.withinSlaUtil)    / Number(t.concluded) : 0,
        slaCorridoPercent: Number(t.concluded) > 0 ? Number(t.withinSlaCorrido) / Number(t.concluded) : 0,
      })),
      qualityIndicators,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
