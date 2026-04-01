import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemModules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/require-auth';
import { slugToHref } from '@/lib/services/module-service';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const slug = String(body.slug || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    if (!slug) {
      return NextResponse.json({ error: 'Slug é obrigatório' }, { status: 400 });
    }

    const [updated] = await db
      .update(systemModules)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(systemModules.id, Number(id)))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[modules:patch]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  try {
    const { id } = await params;
    await db.delete(systemModules).where(eq(systemModules.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[modules:delete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
