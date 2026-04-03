import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const PUBLIC_PATHS = ['/auth', '/waiting'];
const BYPASS_PREFIXES = ['/api/auth', '/_next', '/favicon', '/public'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always bypass static/auth API paths
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get session from Better Auth
  const session = await auth.api.getSession({ headers: request.headers });

  // Redirect to /auth if not authenticated
  if (!session) {
    if (pathname === '/auth') return NextResponse.next();
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Authenticated — allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // For non-API dashboard routes, verify workspace membership
  if (!pathname.startsWith('/api/')) {
    const accessOk = request.cookies.get('workspace_access_ok')?.value === '1';
    if (!accessOk) {
      const memberships = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, session.user.id))
        .limit(1);

      if (memberships.length === 0) {
        return NextResponse.redirect(new URL('/waiting', request.url));
      }

      const response = NextResponse.next();
      response.cookies.set('workspace_access_ok', '1', {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 3600,
        path: '/',
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
