import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { globalDb } from '@/lib/db';
import { workspaceMembers, workspaces } from '@/lib/db/schemas/global';

const PUBLIC_PATHS = ['/auth', '/waiting'];
const BYPASS_PREFIXES = ['/api/auth', '/_next', '/favicon', '/public'];
const RESERVED_SEGMENTS = new Set(['api', 'auth', 'waiting', '_next', 'favicon', 'public']);

function extractWorkspaceSlug(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0]!;
  if (RESERVED_SEGMENTS.has(first)) return null;
  return first;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error('[proxy:getSession]', error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (!session) {
    if (pathname === '/auth') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const memberships = await globalDb
    .select({ slug: workspaces.slug })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.userId, session.user.id), eq(workspaces.isActive, true)));

  if (memberships.length === 0) {
    if (pathname === '/waiting') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/waiting', request.url));
  }

  if (pathname === '/waiting' || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const slugFromUrl = extractWorkspaceSlug(pathname);
  if (!slugFromUrl) {
    return NextResponse.next();
  }

  const hasAccessToSlug = memberships.some((membership) => membership.slug === slugFromUrl);
  if (!hasAccessToSlug) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const currentCookie = request.cookies.get('dwm_active_workspace')?.value;
  if (currentCookie === slugFromUrl) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set('dwm_active_workspace', slugFromUrl, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 86400 * 30,
    path: '/',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
