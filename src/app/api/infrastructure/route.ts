import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { db } from '@/lib/db';
import { infrastructureRecords } from '@/lib/db/schema';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filters = [eq(infrastructureRecords.workspaceId, ctx.workspaceId)];

    if (from) {
      const fromDate = new Date(from);
      const fromVal = fromDate.getFullYear() * 100 + (fromDate.getMonth() + 1);
      filters.push(
        gte(
          sql<number>`${infrastructureRecords.periodYear} * 100 + ${infrastructureRecords.periodMonth}`,
          fromVal
        )
      );
    }

    if (to) {
      const toDate = new Date(to);
      const toVal = toDate.getFullYear() * 100 + (toDate.getMonth() + 1);
      filters.push(
        lte(
          sql<number>`${infrastructureRecords.periodYear} * 100 + ${infrastructureRecords.periodMonth}`,
          toVal
        )
      );
    }

    const rows = await db
      .select()
      .from(infrastructureRecords)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(infrastructureRecords.createdAt))
      .limit(20);

    return NextResponse.json({
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('[infrastructure]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
