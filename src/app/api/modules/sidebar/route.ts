import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { ensureDefaultModules, type AppRole, type SidebarModuleItem } from '@/lib/services/module-service';
import { getUserEffectivePermissions } from '@/lib/services/permission-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result.response) return result.response;
  return runWithWorkspace(req, async () => {
  try {
    const user = result.session.user as { id?: string; role?: AppRole };
    const role = user.role ?? 'user';

    await ensureDefaultModules();

    const modules = await db
      .select()
      .from(systemModules)
      .orderBy(asc(systemModules.sortOrder), asc(systemModules.name));

    let data: SidebarModuleItem[];

    if (role === 'admin') {
      // Admin sees all active + visible modules
      data = modules
        .filter((m) => m.isActive && m.showInSidebar)
        .map((m) => ({
          id: m.id,
          name: m.name,
          slug: m.slug,
          href: m.href,
          icon: m.icon,
          allowImport: m.allowImport,
        }));
    } else {
      // Non-admin: filter by effective permissions
      const userId = user.id ?? '';
      const effectivePerms = userId
        ? await getUserEffectivePermissions(userId)
        : new Set<string>();

      data = modules
        .filter(
          (m) =>
            m.isActive &&
            m.showInSidebar &&
            effectivePerms.has(`${m.slug}.read`)
        )
        .map((m) => ({
          id: m.id,
          name: m.name,
          slug: m.slug,
          href: m.href,
          icon: m.icon,
          allowImport: m.allowImport,
        }));
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[modules:sidebar]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
