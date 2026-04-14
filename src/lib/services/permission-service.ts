import { and, asc, eq, inArray } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import {
  accessGroups,
  groupPermissions,
  permissions,
  userGroups,
  userPermissions,
  workspaceMembers,
} from '@/lib/db/schemas/global';
import type { SystemModule } from '@/lib/db/schema';
const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'import', 'export', 'manage', 'admin'] as const;

const ADMIN_PERMISSION_DEFINITIONS = [
  {
    key: 'admin.users.manage',
    moduleSlug: 'admin.users',
    action: 'manage',
    description: 'Gerenciar membros, roles, grupos e permissoes do workspace.',
  },
  {
    key: 'admin.groups.manage',
    moduleSlug: 'admin.groups',
    action: 'manage',
    description: 'Gerenciar grupos e permissoes do workspace.',
  },
  {
    key: 'admin.modules.manage',
    moduleSlug: 'admin.modules',
    action: 'manage',
    description: 'Gerenciar modulos e configuracoes do workspace.',
  },
  {
    key: 'admin.workspaces.manage',
    moduleSlug: 'admin.workspaces',
    action: 'manage',
    description: 'Gerenciar workspaces em nivel de plataforma.',
  },
];

function buildModulePermissionEntries(modules: SystemModule[]) {
  return modules.flatMap((module) =>
    MODULE_ACTIONS.map((action) => ({
      key: `${module.slug}.${action}`,
      moduleSlug: module.slug,
      action,
      description: `${action} no modulo ${module.name}`,
    }))
  );
}

function expandLegacyPermissionKey(key: string) {
  const expanded = new Set([key]);

  if (key.endsWith('.read')) {
    expanded.add(`${key.slice(0, -5)}.view`);
  }

  if (key.endsWith('.write')) {
    const base = key.slice(0, -6);
    expanded.add(`${base}.edit`);
    expanded.add(`${base}.import`);
  }

  return expanded;
}

async function assertWorkspaceMemberExists(workspaceId: string, userId: string) {
  const [member] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  if (!member) {
    throw new Error('USER_NOT_IN_WORKSPACE');
  }
}

export async function ensureModulePermissions(modules: SystemModule[]) {
  const entries = [...buildModulePermissionEntries(modules), ...ADMIN_PERMISSION_DEFINITIONS];

  if (entries.length === 0) return;

  await db.insert(permissions).values(entries).onConflictDoNothing();
}

export async function getAllPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.moduleSlug), asc(permissions.action));
}

export async function getWorkspacePermissions() {
  const rows = await getAllPermissions();
  return rows.filter((permission) => !['read', 'write'].includes(permission.action));
}

export async function getGroupPermissions(groupId: number): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(groupPermissions)
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
    .where(eq(groupPermissions.groupId, groupId));

  return rows.flatMap((row) => Array.from(expandLegacyPermissionKey(row.key)));
}

export async function getUserEffectivePermissions(userId: string, workspaceId: string): Promise<Set<string>> {
  const groupRows = await db
    .select({ key: permissions.key })
    .from(userGroups)
    .innerJoin(groupPermissions, eq(userGroups.groupId, groupPermissions.groupId))
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
    .where(and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId)));

  const individualRows = await db
    .select({ key: permissions.key })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.workspaceId, workspaceId)));

  const effectivePermissions = new Set<string>();

  for (const row of [...groupRows, ...individualRows]) {
    for (const key of expandLegacyPermissionKey(row.key)) {
      effectivePermissions.add(key);
    }
  }

  return effectivePermissions;
}

export async function hasPermission(userId: string, workspaceId: string, key: string): Promise<boolean> {
  const perms = await getUserEffectivePermissions(userId, workspaceId);
  return perms.has(key);
}

export async function listGroups(workspaceId: string) {
  const groups = await db
    .select()
    .from(accessGroups)
    .where(eq(accessGroups.workspaceId, workspaceId))
    .orderBy(asc(accessGroups.name));

  if (groups.length === 0) {
    return [];
  }

  const allGroupPerms = await db
    .select({
      groupId: groupPermissions.groupId,
      permissionId: groupPermissions.permissionId,
      key: permissions.key,
      moduleSlug: permissions.moduleSlug,
      action: permissions.action,
    })
    .from(groupPermissions)
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
    .where(inArray(groupPermissions.groupId, groups.map((group) => group.id)));

  return groups.map((group) => ({
    ...group,
    permissions: allGroupPerms.filter((permission) => permission.groupId === group.id),
  }));
}

export async function createGroup(workspaceId: string, name: string, description?: string) {
  const [group] = await db
    .insert(accessGroups)
    .values({ workspaceId, name, description: description ?? null })
    .returning();
  return group;
}

export async function updateGroup(
  workspaceId: string,
  id: number,
  data: { name?: string; description?: string }
) {
  const [group] = await db
    .update(accessGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(accessGroups.id, id), eq(accessGroups.workspaceId, workspaceId)))
    .returning();
  return group;
}

export async function deleteGroup(workspaceId: string, id: number) {
  await db.delete(accessGroups).where(and(eq(accessGroups.id, id), eq(accessGroups.workspaceId, workspaceId)));
}

export async function setGroupPermissions(workspaceId: string, groupId: number, permissionIds: number[]) {
  const [group] = await db
    .select({ id: accessGroups.id })
    .from(accessGroups)
    .where(and(eq(accessGroups.id, groupId), eq(accessGroups.workspaceId, workspaceId)))
    .limit(1);

  if (!group) {
    throw new Error('GROUP_NOT_FOUND');
  }

  await db.delete(groupPermissions).where(eq(groupPermissions.groupId, groupId));

  if (permissionIds.length > 0) {
    await db
      .insert(groupPermissions)
      .values(permissionIds.map((permissionId) => ({ groupId, permissionId })))
      .onConflictDoNothing();
  }
}

export async function getUserGroups(userId: string, workspaceId: string) {
  return db
    .select({
      id: accessGroups.id,
      name: accessGroups.name,
      description: accessGroups.description,
    })
    .from(userGroups)
    .innerJoin(
      accessGroups,
      and(eq(userGroups.groupId, accessGroups.id), eq(userGroups.workspaceId, accessGroups.workspaceId))
    )
    .where(and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId)));
}

export async function addUserToGroup(userId: string, workspaceId: string, groupId: number) {
  await assertWorkspaceMemberExists(workspaceId, userId);

  await db
    .insert(userGroups)
    .values({ userId, workspaceId, groupId })
    .onConflictDoNothing();
}

export async function removeUserFromGroup(userId: string, workspaceId: string, groupId: number) {
  await db
    .delete(userGroups)
    .where(
      and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId), eq(userGroups.groupId, groupId))
    );
}

export async function getUserIndividualPermissions(userId: string, workspaceId: string) {
  const rows = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      moduleSlug: permissions.moduleSlug,
      action: permissions.action,
      description: permissions.description,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.workspaceId, workspaceId)));

  return rows.filter((permission) => !['read', 'write'].includes(permission.action));
}

export async function setUserIndividualPermissions(userId: string, workspaceId: string, permissionIds: number[]) {
  await assertWorkspaceMemberExists(workspaceId, userId);

  await db
    .delete(userPermissions)
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.workspaceId, workspaceId)));

  if (permissionIds.length > 0) {
    await db
      .insert(userPermissions)
      .values(permissionIds.map((permissionId) => ({ userId, workspaceId, permissionId })))
      .onConflictDoNothing();
  }
}
