import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { getCancellationsOverview } from '@/lib/services/cancellations-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
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
        workspaceId: ctx.workspaceId,
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null,
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
  });
}
