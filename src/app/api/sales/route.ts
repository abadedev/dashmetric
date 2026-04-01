import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { getSalesOverview } from '@/lib/services/sales-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const data = await getSalesOverview(from ? new Date(from) : null, to ? new Date(to) : null);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[sales]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
