import { NextRequest, NextResponse } from 'next/server';
import { getAtendimentosCollection, getQualityRecordsCollection } from '@/lib/db/mongo';
import { calculateValidAverage } from '@/lib/utils/average';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');

    const [atendCol, qualityCol] = await Promise.all([
      getAtendimentosCollection(),
      getQualityRecordsCollection(),
    ]);

    // Filtro de data para atendimentos (usa aberturaAt → finalizacaoAt → createdAt)
    const dateFilter: Record<string, Date> = {};
    if (fromStr) dateFilter.$gte = new Date(fromStr);
    if (toStr)   dateFilter.$lte = new Date(toStr);

    const atendMatch: Record<string, unknown> = {};
    if (fromStr || toStr) {
      atendMatch.$or = [
        { aberturaAt: dateFilter },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: dateFilter }] },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: null }, { createdAt: dateFilter }] },
      ];
    }

    const qualityMatch: Record<string, unknown> = {};
    const qualityDateFilter: Record<string, Date> = {};
    if (fromStr) qualityDateFilter.$gte = new Date(fromStr);
    if (toStr)   qualityDateFilter.$lte = new Date(toStr);
    if (fromStr || toStr) qualityMatch.openedAt = qualityDateFilter;

    const [totalResult, slaByTypeRaw, qualityIndicatorsRaw] = await Promise.all([
      atendCol.countDocuments(atendMatch),

      atendCol.aggregate([
        { $match: atendMatch },
        {
          $group: {
            _id: { tipo: '$tipo', slaHoras: '$slaHoras' },
            total:             { $sum: 1 },
            concluded:         { $sum: { $cond: [{ $ne: ['$finalizacaoAt', null] }, 1, 0] } },
            withinSlaCorrido:  { $sum: { $cond: [{ $eq: ['$dentroSla', true] }, 1, 0] } },
            withinSlaUtil:     { $sum: { $cond: [{ $eq: ['$dentroSlaUtil', true] }, 1, 0] } },
            avgCorridoSeconds: {
              $avg: { $cond: [{ $ne: ['$finalizacaoAt', null] }, '$slaCorridoSegundos', null] },
            },
            avgUtilSeconds: {
              $avg: { $cond: [{ $ne: ['$finalizacaoAt', null] }, '$slaUtilSegundos', null] },
            },
          },
        },
      ]).toArray(),

      qualityCol.aggregate([
        { $match: qualityMatch },
        { $group: { _id: '$indicator', total: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const slaByType = slaByTypeRaw.map((t) => ({
      activityType:      t._id.tipo,
      slaTargetHours:    t._id.slaHoras,
      total:             t.total,
      concluded:         t.concluded,
      withinSlaCorrido:  t.withinSlaCorrido,
      withinSlaUtil:     t.withinSlaUtil,
      avgCorridoSeconds: t.avgCorridoSeconds,
      avgUtilSeconds:    t.avgUtilSeconds,
      slaUtilPercent:    Number(t.concluded) > 0 ? Number(t.withinSlaUtil) / Number(t.concluded) : 0,
      slaCorridoPercent: Number(t.concluded) > 0 ? Number(t.withinSlaCorrido) / Number(t.concluded) : 0,
    }));

    const qualityIndicators = qualityIndicatorsRaw.map((q) => ({
      indicator: q._id,
      total:     q.total,
    }));

    return NextResponse.json({
      totalAtendimentos: totalResult,
      slaUtilGeral:    calculateValidAverage(slaByType.map((t) => t.slaUtilPercent)),
      slaCorridoGeral: calculateValidAverage(slaByType.map((t) => t.slaCorridoPercent)),
      metaSLA: 0.95,
      slaByType,
      qualityIndicators,
    });
  } catch (err) {
    console.error('[dashboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
