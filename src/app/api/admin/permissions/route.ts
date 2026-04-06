import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { ensureModulePermissions, getWorkspacePermissions } from '@/lib/services/permission-service';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { ensureDefaultModules } from '@/lib/services/module-service';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'admin.groups.manage');
  if (result.response) return result.response;

  try {
    await ensureDefaultModules(result.context.workspaceId);
    const modules = await db
      .select()
      .from(systemModules)
      .where(eq(systemModules.workspaceId, result.context.workspaceId));
    await ensureModulePermissions(modules);
    const data = await getWorkspacePermissions();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:permissions:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
