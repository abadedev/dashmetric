import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qualityRecords } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { and, eq, gte, lte, desc, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr   = searchParams.get('from');
    const toStr     = searchParams.get('to');
    const indicator = searchParams.get('indicator');

    const filters: SQL[] = [];
    if (fromStr) filters.push(gte(qualityRecords.openedAt, new Date(fromStr)));
    if (toStr)   filters.push(lte(qualityRecords.openedAt, new Date(toStr)));
    if (indicator) filters.push(eq(qualityRecords.indicator, indicator as never));

    const whereClause = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        id:             qualityRecords.id,
        osNumber:       qualityRecords.osNumber,
        indicator:      qualityRecords.indicator,
        reason:         qualityRecords.reason,
        clientName:     qualityRecords.clientName,
        city:           qualityRecords.city,
        openedAt:       qualityRecords.openedAt,
        closedAt:       qualityRecords.closedAt,
        durationSeconds:qualityRecords.durationSeconds,
        periodMonth:    qualityRecords.periodMonth,
        periodYear:     qualityRecords.periodYear,
        technicianName: qualityRecords.technicianName,
      })
      .from(qualityRecords)
      .where(whereClause)
      .orderBy(desc(qualityRecords.createdAt))
      .limit(200);

    const data = rows.map((r) => ({
      id:             String(r.id),
      osNumber:       r.osNumber,
      indicator:      r.indicator,
      reason:         r.reason,
      clientName:     r.clientName,
      city:           r.city,
      openedAt:       r.openedAt,
      closedAt:       r.closedAt,
      durationSeconds:r.durationSeconds,
      periodMonth:    r.periodMonth,
      periodYear:     r.periodYear,
      technicianName: r.technicianName,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[quality-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
