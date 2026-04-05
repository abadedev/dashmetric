import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qualityRecords } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { and, desc, eq, gte, ilike, lte, or, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr   = searchParams.get('from');
    const toStr     = searchParams.get('to');
    const indicator = searchParams.get('indicator');
    const city      = searchParams.get('city');
    const plan      = searchParams.get('plan');
    const search    = searchParams.get('search');
    const technicianId = searchParams.get('technicianId');

    const filters: SQL[] = [eq(qualityRecords.workspaceId, ctx.workspaceId)];
    if (fromStr) filters.push(gte(qualityRecords.openedAt, new Date(fromStr)));
    if (toStr)   filters.push(lte(qualityRecords.openedAt, new Date(toStr)));
    if (indicator) filters.push(eq(qualityRecords.indicator, indicator as never));
    if (city) filters.push(ilike(qualityRecords.city, `%${city}%`));
    if (plan) filters.push(ilike(qualityRecords.plan, `%${plan}%`));
    if (technicianId) filters.push(eq(qualityRecords.technicianId, Number(technicianId)));
    if (search) {
      filters.push(or(
        ilike(qualityRecords.osNumber, `%${search}%`),
        ilike(qualityRecords.clientName, `%${search}%`),
        ilike(qualityRecords.technicianName, `%${search}%`),
        ilike(qualityRecords.reason, `%${search}%`),
        ilike(qualityRecords.solution, `%${search}%`),
        ilike(qualityRecords.plan, `%${search}%`)
      )!);
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        id:             qualityRecords.id,
        osNumber:       qualityRecords.osNumber,
        indicator:      qualityRecords.indicator,
        reason:         qualityRecords.reason,
        solution:       qualityRecords.solution,
        clientName:     qualityRecords.clientName,
        city:           qualityRecords.city,
        plan:           qualityRecords.plan,
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
      solution:       r.solution,
      clientName:     r.clientName,
      city:           r.city,
      plan:           r.plan,
      openedAt:       r.openedAt,
      closedAt:       r.closedAt,
      durationSeconds:r.durationSeconds,
      periodMonth:    r.periodMonth,
      periodYear:     r.periodYear,
      technicianName: r.technicianName,
    }));

    return NextResponse.json({
      data,
      filtersApplied: {
        from: fromStr,
        to: toStr,
        indicator,
        city,
        plan,
        technicianId,
        search,
      },
    });
  } catch (err) {
    console.error('[quality-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
