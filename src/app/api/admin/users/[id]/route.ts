import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { user, workspaceMembers } from '@/lib/db/schemas/global';
import { requireWorkspacePermission } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.users.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as {
      globalRole?: 'user' | 'editor' | 'admin';
      workspaceRole?: 'ADMIN' | 'MEMBER' | 'VIEWER';
    };

    if (!body.globalRole && !body.workspaceRole) {
      return NextResponse.json({ error: 'Nenhuma alteracao informada' }, { status: 400 });
    }

    let updatedGlobalRole: { id: string; role: 'user' | 'editor' | 'admin' } | null = null;
    let updatedWorkspaceRole: { userId: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' } | null = null;

    if (body.globalRole) {
      if (result.context.globalRole !== 'admin') {
        return NextResponse.json(
          { error: 'Somente administradores globais podem alterar o papel global.' },
          { status: 403 }
        );
      }

      const [updated] = await db
        .update(user)
        .set({ role: body.globalRole, updatedAt: new Date() })
        .where(eq(user.id, id))
        .returning({ id: user.id, role: user.role });

      if (!updated) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
      }

      updatedGlobalRole = updated;
    }

    if (body.workspaceRole) {
      const [updatedMember] = await db
        .update(workspaceMembers)
        .set({ role: body.workspaceRole, grantedBy: result.context.userId })
        .where(
          and(
            eq(workspaceMembers.workspaceId, result.context.workspaceId),
            eq(workspaceMembers.userId, id)
          )
        )
        .returning({ userId: workspaceMembers.userId, role: workspaceMembers.role });

      if (!updatedMember) {
        return NextResponse.json({ error: 'Usuario nao pertence ao workspace ativo' }, { status: 404 });
      }

      updatedWorkspaceRole = updatedMember;
    }

    return NextResponse.json({ data: { globalRole: updatedGlobalRole, workspaceRole: updatedWorkspaceRole } });
  } catch (error) {
    console.error('[admin:users:PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
