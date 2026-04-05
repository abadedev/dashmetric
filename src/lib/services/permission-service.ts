import { and, eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import {
  accessGroups,
  groupPermissions,
  permissions,
  userGroups,
  userPermissions,
} from '@/lib/db/schemas/global';
import type { SystemModule } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * For each module, upsert `{slug}.read` and `{slug}.write` entries in the
 * permissions table. Uses onConflictDoNothing so it is safe to call often.
 */
export async function ensureModulePermissions(modules: SystemModule[]) {
  const entries = modules.flatMap((m) => [
    {
      key: `${m.slug}.read`,
      moduleSlug: m.slug,
      action: 'read',
      description: `Visualizar o módulo ${m.name}`,
    },
    {
      key: `${m.slug}.write`,
      moduleSlug: m.slug,
      action: 'write',
      description: `Editar e importar dados no módulo ${m.name}`,
    },
  ]);

  if (entries.length === 0) return;

  await db.insert(permissions).values(entries).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function getAllPermissions() {
  return db.select().from(permissions).orderBy(permissions.moduleSlug, permissions.action);
}

export async function getGroupPermissions(groupId: number): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(groupPermissions)
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
    .where(eq(groupPermissions.groupId, groupId));

  return rows.map((r) => r.key);
}

export async function getUserEffectivePermissions(userId: string): Promise<Set<string>> {
  // Permissions from all groups the user belongs to
  const groupRows = await db
    .select({ key: permissions.key })
    .from(userGroups)
    .innerJoin(groupPermissions, eq(userGroups.groupId, groupPermissions.groupId))
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id))
    .where(eq(userGroups.userId, userId));

  // Individual permissions
  const individualRows = await db
    .select({ key: permissions.key })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  const keys = [
    ...groupRows.map((r) => r.key),
    ...individualRows.map((r) => r.key),
  ];

  return new Set(keys);
}

export async function hasPermission(userId: string, key: string): Promise<boolean> {
  const perms = await getUserEffectivePermissions(userId);
  return perms.has(key);
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function listGroups() {
  const groups = await db.select().from(accessGroups).orderBy(accessGroups.name);

  // For each group, fetch its permissions
  const allGroupPerms = await db
    .select({
      groupId: groupPermissions.groupId,
      permissionId: groupPermissions.permissionId,
      key: permissions.key,
      moduleSlug: permissions.moduleSlug,
      action: permissions.action,
    })
    .from(groupPermissions)
    .innerJoin(permissions, eq(groupPermissions.permissionId, permissions.id));

  return groups.map((group) => ({
    ...group,
    permissions: allGroupPerms.filter((p) => p.groupId === group.id),
  }));
}

export async function createGroup(name: string, description?: string) {
  const [group] = await db
    .insert(accessGroups)
    .values({ name, description: description ?? null })
    .returning();
  return group;
}

export async function updateGroup(
  id: number,
  data: { name?: string; description?: string }
) {
  const [group] = await db
    .update(accessGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(accessGroups.id, id))
    .returning();
  return group;
}

export async function deleteGroup(id: number) {
  await db.delete(accessGroups).where(eq(accessGroups.id, id));
}

export async function setGroupPermissions(groupId: number, permissionIds: number[]) {
  await db.delete(groupPermissions).where(eq(groupPermissions.groupId, groupId));

  if (permissionIds.length > 0) {
    await db
      .insert(groupPermissions)
      .values(permissionIds.map((permissionId) => ({ groupId, permissionId })))
      .onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// User ↔ Groups
// ---------------------------------------------------------------------------

export async function getUserGroups(userId: string) {
  return db
    .select({
      id: accessGroups.id,
      name: accessGroups.name,
      description: accessGroups.description,
    })
    .from(userGroups)
    .innerJoin(accessGroups, eq(userGroups.groupId, accessGroups.id))
    .where(eq(userGroups.userId, userId));
}

export async function addUserToGroup(userId: string, groupId: number) {
  await db
    .insert(userGroups)
    .values({ userId, groupId })
    .onConflictDoNothing();
}

export async function removeUserFromGroup(userId: string, groupId: number) {
  await db
    .delete(userGroups)
    .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
}

// ---------------------------------------------------------------------------
// User individual permissions
// ---------------------------------------------------------------------------

export async function getUserIndividualPermissions(userId: string) {
  return db
    .select({
      id: permissions.id,
      key: permissions.key,
      moduleSlug: permissions.moduleSlug,
      action: permissions.action,
      description: permissions.description,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));
}

export async function setUserIndividualPermissions(
  userId: string,
  permissionIds: number[]
) {
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

  if (permissionIds.length > 0) {
    await db
      .insert(userPermissions)
      .values(permissionIds.map((permissionId) => ({ userId, permissionId })))
      .onConflictDoNothing();
  }
}
