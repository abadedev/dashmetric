import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { omnichannelSalesRecords } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { and, asc, desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'vendas.view', {
    moduleSlug: 'vendas',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : null;

    const conditions = [eq(omnichannelSalesRecords.workspaceId, result.context.workspaceId)];
    if (month) conditions.push(eq(omnichannelSalesRecords.periodMonth, month));
    if (year)  conditions.push(eq(omnichannelSalesRecords.periodYear,  year));

    const records = await db
      .select()
      .from(omnichannelSalesRecords)
      .where(and(...conditions))
      .orderBy(desc(omnichannelSalesRecords.quantidade), asc(omnichannelSalesRecords.agente));

    const periods = await db
      .selectDistinct({
        month: omnichannelSalesRecords.periodMonth,
        year:  omnichannelSalesRecords.periodYear,
      })
      .from(omnichannelSalesRecords)
      .where(eq(omnichannelSalesRecords.workspaceId, result.context.workspaceId))
      .orderBy(asc(omnichannelSalesRecords.periodYear), asc(omnichannelSalesRecords.periodMonth));

    return NextResponse.json({ records, periods });
  } catch (err) {
    console.error('[omnichannel-vendas] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
