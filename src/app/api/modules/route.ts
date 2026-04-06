import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { listAllModules, slugToHref } from '@/lib/services/module-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'admin.modules.manage');
  if (result.response) return result.response;

  try {
    const modules = await listAllModules(result.context.workspaceId);
    return NextResponse.json({ data: modules });
  } catch (error) {
    console.error('[modules:get]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'admin.modules.manage');
  if (result.response) return result.response;

  try {
    const body = await req.json();
    const slug = String(body.slug || '').trim().toLowerCase().replace(/\s+/g, '-');

    if (!slug) {
      return NextResponse.json({ error: 'Slug e obrigatorio' }, { status: 400 });
    }

    const [created] = await db
      .insert(systemModules)
      .values({
        workspaceId: result.context.workspaceId,
        name: body.name,
        slug,
        description: body.description || null,
        icon: body.icon,
        href: slugToHref(slug),
        sortOrder: Number(body.sortOrder || 0),
        isActive: Boolean(body.isActive),
        showInSidebar: Boolean(body.showInSidebar),
        allowImport: Boolean(body.allowImport),
        requiredRole: body.requiredRole || 'user',
        templateSource: body.templateSource || null,
        isEditable: body.isEditable ?? true,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[modules:post]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
