import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { infrastructureRecords } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'infraestrutura.view', {
    moduleSlug: 'infraestrutura',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filters = [eq(infrastructureRecords.workspaceId, result.context.workspaceId)];

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
}
