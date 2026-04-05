import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { getSupportTypeSummary } from '@/lib/services/support-summary-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const { searchParams } = new URL(req.url);
      const fromStr = searchParams.get('from');
      const toStr = searchParams.get('to');

      const from = fromStr ? new Date(fromStr) : null;
      const to = toStr ? new Date(toStr) : null;

      const data = await getSupportTypeSummary({ from, to });

      return NextResponse.json({
        data: data.summary,
        total: data.total,
        triageByAttendant: data.triageByAttendant,
      });
    } catch (err) {
      console.error('[support-records]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
