import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { globalDb } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schemas/global';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const PUBLIC_PATHS = ['/auth', '/waiting'];
const BYPASS_PREFIXES = ['/api/auth', '/_next', '/favicon', '/public'];

// First path segments that are NOT workspace slugs
const RESERVED_SEGMENTS = new Set(['api', 'auth', 'waiting', '_next', 'favicon', 'public']);

/**
 * Attempts to extract a workspace slug from a URL like /{slug}/dashboard.
 * Returns null for paths that cannot be workspace-scoped.
 */
function extractWorkspaceSlug(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0]!;
  if (RESERVED_SEGMENTS.has(first)) return null;
  return first;
}

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
      const memberships = await globalDb
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

    // Set dwm_active_workspace from URL if this is a workspace-scoped path
    const slugFromUrl = extractWorkspaceSlug(pathname);
    if (slugFromUrl) {
      const currentCookie = request.cookies.get('dwm_active_workspace')?.value;
      if (currentCookie !== slugFromUrl) {
        const response = NextResponse.next();
        response.cookies.set('dwm_active_workspace', slugFromUrl, {
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 86400 * 30,
          path: '/',
        });
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
