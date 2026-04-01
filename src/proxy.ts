import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: {
      cookie: request.headers.get('cookie') ?? '',
    },
  });

  const session = sessionRes.ok ? await sessionRes.json() : null;

  if (!session?.session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!auth|api|_next/static|_next/image|favicon.ico|placeholder.svg).*)',
  ],
};
