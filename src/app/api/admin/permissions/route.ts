import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { ensureModulePermissions, getAllPermissions } from '@/lib/services/permission-service';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { ensureDefaultModules } from '@/lib/services/module-service';
import { runWithWorkspace } from '@/lib/with-workspace';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    return await runWithWorkspace(req, async (ctx) => {
      await ensureDefaultModules(ctx.workspaceId);
      const modules = await db
        .select()
        .from(systemModules)
        .where(eq(systemModules.workspaceId, ctx.workspaceId));
      await ensureModulePermissions(modules);
      const data = await getAllPermissions();
      return NextResponse.json({ data });
    });
  } catch (error) {
    console.error('[admin:permissions:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
