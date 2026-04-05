import { eq } from 'drizzle-orm';
import { globalDb } from '@/lib/db/connection';
import { workspaces } from '@/lib/db/schemas/global';

/**
 * In-memory cache for workspace slug → UUID resolution.
 * Workspace slugs are immutable after creation, so this is safe
 * for the lifetime of the process.
 */
const slugToIdCache = new Map<string, string>();

/**
 * Resolves a workspace UUID from its slug.
 * Throws if the workspace does not exist.
 */
export async function resolveWorkspaceId(slug: string): Promise<string> {
  const cached = slugToIdCache.get(slug);
  if (cached) return cached;

  const [ws] = await globalDb
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    throw new Error(`[workspace-context] Workspace not found for slug: "${slug}"`);
  }

  slugToIdCache.set(slug, ws.id);
  return ws.id;
}

/** Evicts cached entry — call if a workspace is deactivated or slug changes. */
export function clearWorkspaceIdCache(slug?: string): void {
  if (slug) {
    slugToIdCache.delete(slug);
  } else {
    slugToIdCache.clear();
  }
}

export type WorkspaceContext = {
  slug: string;
  workspaceId: string; // UUID from workspaces.id
};
