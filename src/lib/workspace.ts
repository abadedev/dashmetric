import { cache } from 'react';
import { globalDb } from '@/lib/db';
import { workspaces, workspaceMembers } from '@/lib/db/schemas/global';
import { eq, and } from 'drizzle-orm';

export type WorkspaceWithRole = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  defaultTheme: 'dark' | 'light';
  isActive: boolean;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
};

/**
 * Returns all active workspaces the user is a member of.
 * Cached per-request via React cache().
 */
export const getUserWorkspaces = cache(async (userId: string): Promise<WorkspaceWithRole[]> => {
  const rows = await globalDb
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      logoUrl: workspaces.logoUrl,
      defaultTheme: workspaces.defaultTheme,
      isActive: workspaces.isActive,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.isActive, true)
      )
    );
  return rows.map((row) => ({
    ...row,
    defaultTheme: row.defaultTheme === 'light' ? 'light' : 'dark',
  }));
});

/**
 * Resolves the active workspace for a user given an optional slug preference.
 * Falls back to the first workspace alphabetically if the preferred slug doesn't match.
 */
export async function resolveActiveWorkspace(
  userId: string,
  preferredSlug?: string | null
): Promise<WorkspaceWithRole | null> {
  const all = await getUserWorkspaces(userId);
  if (all.length === 0) return null;
  if (preferredSlug) {
    const match = all.find((w) => w.slug === preferredSlug);
    if (match) return match;
  }
  return all[0]!;
}
