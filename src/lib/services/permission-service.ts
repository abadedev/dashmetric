import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import {
  accessGroups,
  groupModuleAccess,
  groupPermissions,
  permissions,
  userGroups,
  userModuleAccess,
  userPermissions,
  workspaceMembers,
} from '@/lib/db/schemas/global';
import type { SystemModule } from '@/lib/db/schema';
import {
  accessLevelAllows,
  getPermissionIdsForModuleAccessLevel,
  isGlobalPermissionModule,
  maxModuleAccessLevel,
  resolveUserModulePermissions,
  type ModuleAccessLevel,
  resolveModuleAccessMapFromKeys,
} from '@/lib/module-access';

const MODULE_ACTIONS = [
  'view',
  'details',
  'create',
  'edit',
  'share',
  'finalize',
  'export',
  'import',
  'delete',
  'manage',
  'admin',
] as const;

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

async function ensureAccessLevelTables() {
  await db.execute(sql`
    create table if not exists group_module_access (
      id serial primary key,
      group_id integer not null references access_groups(id) on delete cascade,
      module_slug varchar(120) not null,
      access_level varchar(20) not null,
      created_at timestamp default now() not null,
      updated_at timestamp default now() not null,
      unique(group_id, module_slug)
    )
  `);

  await db.execute(sql`
    create index if not exists group_module_access_group_idx
    on group_module_access(group_id)
  `);

  await db.execute(sql`
    create index if not exists group_module_access_module_idx
    on group_module_access(module_slug)
  `);

  await db.execute(sql`
    create table if not exists user_module_access (
      id serial primary key,
      workspace_id uuid not null references workspaces(id) on delete cascade,
      user_id text not null references "user"(id) on delete cascade,
      module_slug varchar(120) not null,
      access_level varchar(20) not null,
      created_at timestamp default now() not null,
      updated_at timestamp default now() not null,
      unique(workspace_id, user_id, module_slug)
    )
  `);

  await db.execute(sql`
    create index if not exists user_module_access_workspace_user_idx
    on user_module_access(workspace_id, user_id)
  `);

  await db.execute(sql`
    create index if not exists user_module_access_module_idx
    on user_module_access(module_slug)
  `);
}

function mapRowsToModuleAccess(rows: Array<{ moduleSlug: string; accessLevel: string }>) {
  const accessMap: Record<string, ModuleAccessLevel> = {};

  for (const row of rows) {
    const level = row.accessLevel as ModuleAccessLevel;
    accessMap[row.moduleSlug] = maxModuleAccessLevel(accessMap[row.moduleSlug], level);
  }

  return accessMap;
}

function canonicalizePermissionIdsForModuleAccess(
  allPermissions: Array<{ id: number; moduleSlug: string; action: string; key: string }>,
  moduleAccess: Record<string, ModuleAccessLevel>
) {
  return Object.entries(moduleAccess).flatMap(([moduleSlug, level]) =>
    getPermissionIdsForModuleAccessLevel(allPermissions, moduleSlug, level)
  );
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
  await ensureAccessLevelTables();

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

  const [groupAccessRows, userAccessRows] = await Promise.all([
    db
      .select({ moduleSlug: groupModuleAccess.moduleSlug, accessLevel: groupModuleAccess.accessLevel })
      .from(userGroups)
      .innerJoin(groupModuleAccess, eq(userGroups.groupId, groupModuleAccess.groupId))
      .where(and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId))),
    db
      .select({ moduleSlug: userModuleAccess.moduleSlug, accessLevel: userModuleAccess.accessLevel })
      .from(userModuleAccess)
      .where(and(eq(userModuleAccess.userId, userId), eq(userModuleAccess.workspaceId, workspaceId))),
  ]);

  const resolvedAccessMap = {
    ...resolveModuleAccessMapFromKeys(effectivePermissions),
    ...mapRowsToModuleAccess(groupAccessRows),
  };

  const userAccessMap = mapRowsToModuleAccess(userAccessRows);
  for (const [moduleSlug, level] of Object.entries(userAccessMap)) {
    resolvedAccessMap[moduleSlug] = maxModuleAccessLevel(resolvedAccessMap[moduleSlug], level);
  }

  for (const [moduleSlug, level] of Object.entries(resolvedAccessMap)) {
    if (level === 'none') continue;

    for (const action of MODULE_ACTIONS) {
      if (accessLevelAllows(level, action)) {
        effectivePermissions.add(`${moduleSlug}.${action}`);
      }
    }
  }

  return effectivePermissions;
}

export async function hasPermission(userId: string, workspaceId: string, key: string): Promise<boolean> {
  const perms = await getUserEffectivePermissions(userId, workspaceId);
  return perms.has(key);
}

export async function listGroups(workspaceId: string) {
  await ensureAccessLevelTables();

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

  const accessRows = await db
    .select({
      groupId: groupModuleAccess.groupId,
      moduleSlug: groupModuleAccess.moduleSlug,
      accessLevel: groupModuleAccess.accessLevel,
    })
    .from(groupModuleAccess)
    .where(inArray(groupModuleAccess.groupId, groups.map((group) => group.id)));

  return groups.map((group) => ({
    ...group,
    permissions: allGroupPerms.filter((permission) => permission.groupId === group.id),
    moduleAccess: mapRowsToModuleAccess(accessRows.filter((access) => access.groupId === group.id)),
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
  await ensureAccessLevelTables();

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

export async function setGroupAccessProfile(
  workspaceId: string,
  groupId: number,
  moduleAccess: Record<string, ModuleAccessLevel>,
  globalPermissionIds: number[]
) {
  await ensureAccessLevelTables();

  const [group] = await db
    .select({ id: accessGroups.id })
    .from(accessGroups)
    .where(and(eq(accessGroups.id, groupId), eq(accessGroups.workspaceId, workspaceId)))
    .limit(1);

  if (!group) {
    throw new Error('GROUP_NOT_FOUND');
  }

  const allPermissions = await getWorkspacePermissions();
  const canonicalModulePermissionIds = canonicalizePermissionIdsForModuleAccess(allPermissions, moduleAccess);
  const safeGlobalPermissionIds = allPermissions
    .filter((permission) => globalPermissionIds.includes(permission.id) && isGlobalPermissionModule(permission.moduleSlug))
    .map((permission) => permission.id);

  await db.delete(groupModuleAccess).where(eq(groupModuleAccess.groupId, groupId));

  const moduleEntries = Object.entries(moduleAccess).map(([moduleSlug, accessLevel]) => ({
    groupId,
    moduleSlug,
    accessLevel,
  }));

  if (moduleEntries.length > 0) {
    await db.insert(groupModuleAccess).values(moduleEntries).onConflictDoNothing();
  }

  await db.delete(groupPermissions).where(eq(groupPermissions.groupId, groupId));

  const permissionIds = [...new Set([...safeGlobalPermissionIds, ...canonicalModulePermissionIds])];

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
  await ensureAccessLevelTables();

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
  await ensureAccessLevelTables();
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

export async function getUserIndividualAccessProfile(userId: string, workspaceId: string) {
  await ensureAccessLevelTables();

  const [permissionRows, accessRows] = await Promise.all([
    getUserIndividualPermissions(userId, workspaceId),
    db
      .select({ moduleSlug: userModuleAccess.moduleSlug, accessLevel: userModuleAccess.accessLevel })
      .from(userModuleAccess)
      .where(and(eq(userModuleAccess.userId, userId), eq(userModuleAccess.workspaceId, workspaceId))),
  ]);

  const moduleAccess = {
    ...resolveModuleAccessMapFromKeys(permissionRows.map((permission) => permission.key)),
    ...mapRowsToModuleAccess(accessRows),
  };

  const globalPermissions = permissionRows.filter((permission) => isGlobalPermissionModule(permission.moduleSlug));

  return {
    permissions: permissionRows,
    moduleAccess,
    globalPermissions,
  };
}

export async function setUserIndividualAccessProfile(
  userId: string,
  workspaceId: string,
  moduleAccess: Record<string, ModuleAccessLevel>,
  globalPermissionIds: number[]
) {
  await ensureAccessLevelTables();
  await assertWorkspaceMemberExists(workspaceId, userId);

  const allPermissions = await getWorkspacePermissions();
  const canonicalModulePermissionIds = canonicalizePermissionIdsForModuleAccess(allPermissions, moduleAccess);
  const safeGlobalPermissionIds = allPermissions
    .filter((permission) => globalPermissionIds.includes(permission.id) && isGlobalPermissionModule(permission.moduleSlug))
    .map((permission) => permission.id);

  await db
    .delete(userModuleAccess)
    .where(and(eq(userModuleAccess.userId, userId), eq(userModuleAccess.workspaceId, workspaceId)));

  const moduleEntries = Object.entries(moduleAccess).map(([moduleSlug, accessLevel]) => ({
    workspaceId,
    userId,
    moduleSlug,
    accessLevel,
  }));

  if (moduleEntries.length > 0) {
    await db.insert(userModuleAccess).values(moduleEntries).onConflictDoNothing();
  }

  await db
    .delete(userPermissions)
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.workspaceId, workspaceId)));

  const permissionIds = [...new Set([...safeGlobalPermissionIds, ...canonicalModulePermissionIds])];

  if (permissionIds.length > 0) {
    await db
      .insert(userPermissions)
      .values(permissionIds.map((permissionId) => ({ userId, workspaceId, permissionId })))
      .onConflictDoNothing();
  }
}

export async function getUserEffectiveModuleAccess(userId: string, workspaceId: string) {
  await ensureAccessLevelTables();

  const [groupPermissionRows, individualPermissionRows, groupAccessRows, userAccessRows] = await Promise.all([
    db
      .select({ key: permissions.key })
      .from(userGroups)
      .innerJoin(groupPermissions, eq(userGroups.groupId, groupPermissions.groupId))
      .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
      .where(and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId))),
    db
      .select({ key: permissions.key })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.workspaceId, workspaceId))),
    db
      .select({ moduleSlug: groupModuleAccess.moduleSlug, accessLevel: groupModuleAccess.accessLevel })
      .from(userGroups)
      .innerJoin(groupModuleAccess, eq(userGroups.groupId, groupModuleAccess.groupId))
      .where(and(eq(userGroups.userId, userId), eq(userGroups.workspaceId, workspaceId))),
    db
      .select({ moduleSlug: userModuleAccess.moduleSlug, accessLevel: userModuleAccess.accessLevel })
      .from(userModuleAccess)
      .where(and(eq(userModuleAccess.userId, userId), eq(userModuleAccess.workspaceId, workspaceId))),
  ]);

  const groupLevelMap = resolveModuleAccessMapFromKeys(
    groupPermissionRows.flatMap((row) => Array.from(expandLegacyPermissionKey(row.key)))
  );
  const userOverrideMapFromLegacy = resolveModuleAccessMapFromKeys(
    individualPermissionRows.flatMap((row) => Array.from(expandLegacyPermissionKey(row.key)))
  );

  const mergedGroupPermissions = { ...groupLevelMap };
  for (const [moduleSlug, level] of Object.entries(mapRowsToModuleAccess(groupAccessRows))) {
    mergedGroupPermissions[moduleSlug] = maxModuleAccessLevel(mergedGroupPermissions[moduleSlug], level);
  }

  const mergedUserOverrides = { ...userOverrideMapFromLegacy };
  for (const [moduleSlug, level] of Object.entries(mapRowsToModuleAccess(userAccessRows))) {
    mergedUserOverrides[moduleSlug] = level;
  }

  return resolveUserModulePermissions(mergedGroupPermissions, mergedUserOverrides);
}
