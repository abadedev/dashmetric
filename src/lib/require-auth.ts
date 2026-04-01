import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireAuth(req: NextRequest): Promise<
  { session: NonNullable<Session>; response: null } | { session: null; response: NextResponse }
> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, response: null };
}

export async function requireAdmin(req: NextRequest): Promise<
  { session: NonNullable<Session>; response: null } | { session: null; response: NextResponse }
> {
  const result = await requireAuth(req);
  if (result.response) return result;
  const user = result.session.user as { role?: string };
  if (user?.role !== 'admin') {
    return { session: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
