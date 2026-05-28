import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { requireWorkspaceAccess } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { ensureDefaultModules, type SidebarModuleItem } from '@/lib/services/module-service';
import { hasGlobalRole } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;
  try {
    await ensureDefaultModules(result.context.workspaceId);

    const modules = await db
      .select()
      .from(systemModules)
      .where(eq(systemModules.workspaceId, result.context.workspaceId))
      .orderBy(asc(systemModules.sortOrder), asc(systemModules.name));

    const ctx = result.context;
    const data: SidebarModuleItem[] = modules
      .filter((module) => {
        if (!module.isActive || !module.showInSidebar) return false;
        if (hasGlobalRole(ctx, 'admin')) return true;
        if (ctx.workspaceRole === null) return false;
        const level = ctx.moduleAccess[module.slug];
        return Boolean(level && level !== 'none');
      })
      .map((module) => ({
        id: module.id,
        name: module.name,
        slug: module.slug,
        href: module.href,
        icon: module.icon,
        allowImport: module.allowImport,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[modules:sidebar]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
