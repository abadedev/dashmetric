import { NextRequest, NextResponse } from 'next/server';
import { getQualityRecordsCollection } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/require-auth';
import type { Filter } from 'mongodb';
import type { QualityRecordDoc } from '@/lib/db/mongo-types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr    = searchParams.get('from');
    const toStr      = searchParams.get('to');
    const indicator  = searchParams.get('indicator');

    const col = await getQualityRecordsCollection();

    const filter: Filter<QualityRecordDoc> = {};
    const dateFilter: Record<string, Date> = {};
    if (fromStr) dateFilter.$gte = new Date(fromStr);
    if (toStr)   dateFilter.$lte = new Date(toStr);
    if (fromStr || toStr) filter.openedAt = dateFilter as any;
    if (indicator) filter.indicator = indicator;

    const rows = await col
      .find(filter, {
        projection: {
          osNumber: 1, indicator: 1, reason: 1,
          clientName: 1, city: 1,
          openedAt: 1, closedAt: 1, durationSeconds: 1,
          periodMonth: 1, periodYear: 1,
          technicianName: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const data = rows.map((r) => ({
      id:              r._id?.toString(),
      osNumber:        r.osNumber,
      indicator:       r.indicator,
      reason:          r.reason,
      clientName:      r.clientName,
      city:            r.city,
      openedAt:        r.openedAt,
      closedAt:        r.closedAt,
      durationSeconds: r.durationSeconds,
      periodMonth:     r.periodMonth,
      periodYear:      r.periodYear,
      technicianName:  r.technicianName,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[quality-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
