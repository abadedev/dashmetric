import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { workspaceMembers, user } from '@/lib/db/schemas/global';
import { requireWorkspaceRole } from '@/lib/require-auth';

export async function POST(req: NextRequest) {
  const { context, response } = await requireWorkspaceRole(req, 'ADMIN');
  if (response) return response;

  const body = (await req.json()) as { userId?: string };
  if (!body.userId?.trim()) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  // Confirm user exists
  const [target] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, body.userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Prevent double membership
  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, context.workspaceId),
        eq(workspaceMembers.userId, body.userId),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'Usuário já é membro deste workspace' }, { status: 409 });
  }

  const [created] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: context.workspaceId,
      userId: body.userId,
      role: 'VIEWER',
      grantedBy: context.userId,
    })
    .returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
