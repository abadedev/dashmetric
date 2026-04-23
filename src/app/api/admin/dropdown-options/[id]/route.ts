import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/require-auth';
import { hasGlobalRole, type AuthorizationContext } from '@/lib/authorization';
import { db } from '@/lib/db';
import { dropdownOptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const ALLOWED_MODULE_SLUGS = ['infraestrutura', 'listagem-servicos'];

function canManageDropdowns(context: AuthorizationContext) {
  if (hasGlobalRole(context, 'admin')) return true;
  if (context.workspaceRole === 'ADMIN') return true;
  return ALLOWED_MODULE_SLUGS.some((slug) => context.moduleAccess[slug] === 'admin');
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;
  if (!canManageDropdowns(result.context)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { label, sortOrder, isActive } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (label !== undefined) updates.label = label.trim();
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(dropdownOptions)
    .set(updates)
    .where(eq(dropdownOptions.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;
  if (!canManageDropdowns(result.context)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(dropdownOptions).where(eq(dropdownOptions.id, Number(id)));
  return NextResponse.json({ success: true });
}
