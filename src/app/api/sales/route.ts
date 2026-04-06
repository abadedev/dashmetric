import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getSalesOverview } from '@/lib/services/sales-service';

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
    const plan = searchParams.get('plan');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const data = await getSalesOverview({
      workspaceId: result.context.workspaceId,
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
      city,
      plan,
      source,
      search,
      type,
    });
    return NextResponse.json({
      ...data,
      filtersApplied: {
        from,
        to,
        city,
        plan,
        source,
        search,
        type,
      },
    });
  } catch (error) {
    console.error('[sales]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
