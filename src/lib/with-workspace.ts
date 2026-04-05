import { NextRequest } from 'next/server';
import { resolveWorkspaceId, type WorkspaceContext } from '@/lib/db/workspace-context';

/**
 * Extracts the active workspace slug from the request cookie.
 * Falls back to 'dstech' for backward compatibility.
 */
export function getWorkspaceSlug(req: NextRequest): string {
  return req.cookies.get('dwm_active_workspace')?.value ?? 'dstech';
}

/**
 * Wraps an API route handler with workspace context.
 * The handler receives a WorkspaceContext ({ slug, workspaceId }) and must
 * use `ctx.workspaceId` explicitly in queries.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     return runWithWorkspace(req, async (ctx) => {
 *       // ctx.workspaceId — use this to scope all queries
 *     });
 *   }
 */
export async function runWithWorkspace<T>(
  req: NextRequest,
  fn: (ctx: WorkspaceContext) => Promise<T>
): Promise<T> {
  const slug = getWorkspaceSlug(req);
  const workspaceId = await resolveWorkspaceId(slug);
  const ctx: WorkspaceContext = { slug, workspaceId };
  return fn(ctx);
}
