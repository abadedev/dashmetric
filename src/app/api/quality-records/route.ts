import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qualityRecords, technicians } from '@/lib/db/schema';
import { desc, eq, and, count, gte, lte } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const indicator = searchParams.get('indicator');

    const filters = [];
    if (fromStr) filters.push(gte(qualityRecords.openedAt, new Date(fromStr)));
    if (toStr) filters.push(lte(qualityRecords.openedAt, new Date(toStr)));
    if (indicator) filters.push(eq(qualityRecords.indicator, indicator as any));

    const rows = await db
      .select({
        id: qualityRecords.id,
        osNumber: qualityRecords.osNumber,
        indicator: qualityRecords.indicator,
        reason: qualityRecords.reason,
        clientName: qualityRecords.clientName,
        city: qualityRecords.city,
        openedAt: qualityRecords.openedAt,
        closedAt: qualityRecords.closedAt,
        durationSeconds: qualityRecords.durationSeconds,
        periodMonth: qualityRecords.periodMonth,
        periodYear: qualityRecords.periodYear,
        technicianName: technicians.name,
      })
      .from(qualityRecords)
      .leftJoin(technicians, eq(qualityRecords.technicianId, technicians.id))
      .where(and(...filters))
      .orderBy(desc(qualityRecords.createdAt))
      .limit(200);

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
