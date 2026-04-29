import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getSalesReferralOverview } from '@/lib/services/sales-referral-service';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';

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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    const data = await getSalesReferralOverview({
      workspaceId: result.context.workspaceId,
      from: from ? parseDateFrom(from) : null,
      to: to ? parseDateTo(to) : null,
      city,
      search,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[sales-referrals]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
