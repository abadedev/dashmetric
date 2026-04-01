import { NextRequest, NextResponse } from 'next/server';
import { getAtendimentosCollection } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');

    const col = await getAtendimentosCollection();

    const dateFilter: Record<string, Date> = {};
    if (fromStr) dateFilter.$gte = new Date(fromStr);
    if (toStr)   dateFilter.$lte = new Date(toStr);

    const match: Record<string, unknown> = {};
    if (fromStr || toStr) {
      match.$or = [
        { aberturaAt: dateFilter },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: dateFilter }] },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: null }, { createdAt: dateFilter }] },
      ];
    }

    const summaryRaw = await col.aggregate([
      { $match: match },
      {
        $addFields: {
          _dataRef: {
            $ifNull: ['$aberturaAt', { $ifNull: ['$finalizacaoAt', '$createdAt'] }],
          },
        },
      },
      {
        $group: {
          _id: {
            periodYear:   { $year: '$_dataRef' },
            periodMonth:  { $month: '$_dataRef' },
            activityType: '$tipo',
            slaTargetHours: '$slaHoras',
          },
          total:            { $sum: 1 },
          concluded:        { $sum: { $cond: [{ $ne: ['$finalizacaoAt', null] }, 1, 0] } },
          withinSlaCorrido: { $sum: { $cond: [{ $eq: ['$dentroSla', true] }, 1, 0] } },
          withinSlaUtil:    { $sum: { $cond: [{ $eq: ['$dentroSlaUtil', true] }, 1, 0] } },
        },
      },
      { $sort: { '_id.periodYear': 1, '_id.periodMonth': 1 } },
    ]).toArray();

    const data = summaryRaw.map((s) => ({
      periodYear:       s._id.periodYear,
      periodMonth:      s._id.periodMonth,
      activityType:     s._id.activityType,
      slaTargetHours:   s._id.slaTargetHours,
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
