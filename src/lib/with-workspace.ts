import { NextRequest, NextResponse } from 'next/server';
import { withWorkspaceDb } from '@/lib/db';

/**
 * Extracts the active workspace slug from the request cookie.
 * Falls back to 'dstech' for backward compatibility.
 */
export function getWorkspaceSlug(req: NextRequest): string {
  return req.cookies.get('dwm_active_workspace')?.value ?? 'dstech';
}

/**
 * Wraps an API route handler with workspace-scoped db context.
 * The handler receives the workspace slug and runs with the correct search_path.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     return runWithWorkspace(req, async () => {
 *       // db queries here automatically use the correct workspace schema
 *     });
 *   }
 */
export async function runWithWorkspace<T>(
  req: NextRequest,
  fn: (slug: string) => Promise<T>
): Promise<T> {
  const slug = getWorkspaceSlug(req);
  return withWorkspaceDb(slug, () => fn(slug));
}
