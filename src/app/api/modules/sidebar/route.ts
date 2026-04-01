import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { listSidebarModules, type AppRole } from '@/lib/services/module-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  try {
    const user = result.session.user as { role?: AppRole };
    const role = user.role ?? 'user';
    const data = await listSidebarModules(role);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[modules:sidebar]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
