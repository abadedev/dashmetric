import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaceMembers, workspaces } from '@/lib/db/schemas/global';
import { user } from '@/lib/db/schemas/global';
import { eq, and } from 'drizzle-orm';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;

  const members = await db
    .select({
      memberId: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      grantedAt: workspaceMembers.grantedAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(user.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, id));

  return NextResponse.json({ data: members });
}

export async function POST(req: NextRequest, ctx: Context) {
  const { response, session } = await requireAdmin(req);
  if (response) return response;

  const { id: workspaceId } = await ctx.params;

  // Verify workspace exists
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  }

  const body = (await req.json()) as { userId?: string; role?: string };
  if (!body.userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  const role = (['ADMIN', 'MEMBER', 'VIEWER'].includes(body.role ?? '') ? body.role : 'MEMBER') as
    | 'ADMIN'
    | 'MEMBER'
    | 'VIEWER';

  const [created] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId: body.userId,
      role,
      grantedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role, grantedBy: session.user.id },
    })
    .returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
