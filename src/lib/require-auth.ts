import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizationContext,
  canPerformAction,
  hasGlobalRole,
  hasPermission,
  hasWorkspaceRole,
  type AuthorizationContext,
} from '@/lib/authorization';
import { isWorkspaceNotFoundError } from '@/lib/db/workspace-context';

type Session = Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>;

export async function requireAuth(req: NextRequest): Promise<
  { session: NonNullable<Session>; response: null } | { session: null; response: NextResponse }
> {
  const { auth } = await import('@/lib/auth');
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

function getWorkspaceSlug(req: NextRequest) {
  return req.cookies.get('dwm_active_workspace')?.value ?? 'dstech';
}

export async function requireWorkspaceAccess(req: NextRequest): Promise<
  { context: AuthorizationContext; response: null } | { context: null; response: NextResponse }
> {
  const workspaceSlug = getWorkspaceSlug(req);
  let context: AuthorizationContext | null;

  try {
    context = await buildAuthorizationContext(req.headers, workspaceSlug);
  } catch (error) {
    if (isWorkspaceNotFoundError(error)) {
      console.warn('[authorization] invalid workspace in request context', { workspaceSlug });
      return {
        context: null,
        response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }),
      };
    }

    console.error('[authorization] failed to build workspace context', {
      workspaceSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      context: null,
      response: NextResponse.json({ error: 'Unable to resolve workspace context' }, { status: 500 }),
    };
  }

  if (!context) {
    return { context: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!hasGlobalRole(context, 'admin') && context.workspaceRole === null) {
    return { context: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { context, response: null };
}

export async function requireWorkspaceRole(
  req: NextRequest,
  roles: 'ADMIN' | 'MEMBER' | 'VIEWER' | Array<'ADMIN' | 'MEMBER' | 'VIEWER'>
): Promise<{ context: AuthorizationContext; response: null } | { context: null; response: NextResponse }> {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result;

  if (!hasWorkspaceRole(result.context, roles) && !hasGlobalRole(result.context, 'admin')) {
    return { context: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return result;
}

export async function requireWorkspacePermission(
  req: NextRequest,
  permission: string,
  options?: { moduleSlug?: string; action?: string; requiredRole?: 'user' | 'editor' | 'admin' }
): Promise<{ context: AuthorizationContext; response: null } | { context: null; response: NextResponse }> {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result;

  const allowed =
    hasPermission(result.context, permission) ||
    (options?.moduleSlug && options?.action
      ? canPerformAction(result.context, options.moduleSlug, options.action, options.requiredRole)
      : false);

  if (!allowed) {
    return { context: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return result;
}
