import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { globalDb } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schemas/global';
import { resolveWorkspaceId } from '@/lib/db/workspace-context';
import { getUserEffectivePermissions } from '@/lib/services/permission-service';
import type { AppRole } from '@/lib/services/module-service';
import type { SystemModule } from '@/lib/db/schema';

export type GlobalRole = AppRole;
export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER' | null;

export type AuthorizationContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  userId: string;
  globalRole: GlobalRole;
  workspaceSlug: string;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  effectivePermissions: Set<string>;
};

const GLOBAL_BYPASS_ROLES = new Set<GlobalRole>(['admin']);

export function hasGlobalRole(
  input: AuthorizationContext | GlobalRole | undefined,
  roles: GlobalRole | GlobalRole[]
) {
  const candidate = typeof input === 'string' ? input : input?.globalRole;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return candidate ? allowed.includes(candidate) : false;
}

export function hasWorkspaceRole(
  input: AuthorizationContext | WorkspaceRole | undefined,
  roles: Exclude<WorkspaceRole, null> | Array<Exclude<WorkspaceRole, null>>
) {
  const candidate = typeof input === 'string' ? input : input?.workspaceRole;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return candidate ? allowed.includes(candidate as Exclude<WorkspaceRole, null>) : false;
}

export function getEffectivePermissions(context: AuthorizationContext) {
  return new Set(context.effectivePermissions);
}

export function hasPermission(context: AuthorizationContext, permission: string) {
  if (hasGlobalRole(context, Array.from(GLOBAL_BYPASS_ROLES))) return true;
  if (hasWorkspaceRole(context, 'ADMIN')) return true;
  return context.effectivePermissions.has(permission);
}

export function hasAnyPermission(context: AuthorizationContext, permissions: string[]) {
  return permissions.some((permission) => hasPermission(context, permission));
}

export function hasAllPermissions(context: AuthorizationContext, permissions: string[]) {
  return permissions.every((permission) => hasPermission(context, permission));
}

function fallbackModuleAccessByRole(context: AuthorizationContext, requiredRole: AppRole) {
  if (hasGlobalRole(context, Array.from(GLOBAL_BYPASS_ROLES))) return true;
  if (hasWorkspaceRole(context, 'ADMIN')) return true;
  return requiredRole === 'user' && context.workspaceRole !== null;
}

export function canAccessModule(context: AuthorizationContext, module: Pick<SystemModule, 'slug' | 'requiredRole'>) {
  return canPerformAction(context, module.slug, 'view', module.requiredRole);
}

export function canPerformAction(
  context: AuthorizationContext,
  moduleSlug: string,
  action: string,
  requiredRole?: AppRole
) {
  if (hasPermission(context, `${moduleSlug}.${action}`)) return true;

  if (action === 'view' && requiredRole) {
    return fallbackModuleAccessByRole(context, requiredRole);
  }

  return false;
}

export async function buildAuthorizationContext(
  headers: Headers,
  workspaceSlug: string
): Promise<AuthorizationContext | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }

  const userId = session.user.id;
  const globalRole = ((session.user as { role?: AppRole }).role ?? 'user') as GlobalRole;
  const workspaceId = await resolveWorkspaceId(workspaceSlug);

  const [membership] = await globalDb
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  if (!membership && !GLOBAL_BYPASS_ROLES.has(globalRole)) {
    return {
      session,
      userId,
      globalRole,
      workspaceSlug,
      workspaceId,
      workspaceRole: null,
      effectivePermissions: new Set<string>(),
    };
  }

  const effectivePermissions = await getUserEffectivePermissions(userId, workspaceId);

  return {
    session,
    userId,
    globalRole,
    workspaceSlug,
    workspaceId,
    workspaceRole: membership?.role ?? null,
    effectivePermissions,
  };
}
