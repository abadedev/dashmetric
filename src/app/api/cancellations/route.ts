import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getCancellationsOverview } from '@/lib/services/cancellations-service';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'cancelamentos.view', {
    moduleSlug: 'cancelamentos',
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
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const data = await getCancellationsOverview({
      workspaceId: result.context.workspaceId,
      from: from ? parseDateFrom(from) : null,
      to: to ? parseDateTo(to) : null,
      city,
      plan,
      source,
      category,
      search,
    });
    return NextResponse.json({
      ...data,
      filtersApplied: {
        from,
        to,
        city,
        plan,
        source,
        category,
        search,
      },
    });
  } catch (error) {
    console.error('[cancellations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
