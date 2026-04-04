import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schemas/global';
import { eq, and } from 'drizzle-orm';

interface Context {
  params: Promise<{ id: string; userId: string }>;
}

export async function PATCH(req: NextRequest, ctx: Context) {
  const { response, session } = await requireAdmin(req);
  if (response) return response;

  const { id: workspaceId, userId } = await ctx.params;
  const body = (await req.json()) as { role?: string };

  const role = (['ADMIN', 'MEMBER', 'VIEWER'].includes(body.role ?? '') ? body.role : null) as
    | 'ADMIN'
    | 'MEMBER'
    | 'VIEWER'
    | null;

  if (!role) {
    return NextResponse.json({ error: 'role inválida' }, { status: 400 });
  }

  const [updated] = await db
    .update(workspaceMembers)
    .set({ role, grantedBy: session.user.id })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id: workspaceId, userId } = await ctx.params;

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}
