import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaces, workspaceMembers, user } from '@/lib/db/schemas/global';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'admin.users.manage');
  if (result.response) return result.response;

  const body = (await req.json()) as {
    workspaceSlug?: string;
    email?: string;
    role?: string;
  };

  if (!body.workspaceSlug || !body.email) {
    return NextResponse.json({ error: 'workspaceSlug e email sao obrigatorios' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(and(eq(workspaces.slug, body.workspaceSlug), eq(workspaces.isActive, true)))
    .limit(1);

  if (!ws) {
    return NextResponse.json({ error: 'Workspace nao encontrado' }, { status: 404 });
  }

  if (ws.id !== result.context.workspaceId && result.context.globalRole !== 'admin') {
    return NextResponse.json({ error: 'O convite deve usar o workspace ativo.' }, { status: 403 });
  }

  const [invitee] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!invitee) {
    return NextResponse.json(
      {
        error: `Nenhum usuario encontrado com o email "${email}". O usuario precisa ter feito login pelo menos uma vez.`,
      },
      { status: 404 }
    );
  }

  const role = (['ADMIN', 'MEMBER', 'VIEWER'].includes(body.role ?? '') ? body.role : 'MEMBER') as
    | 'ADMIN'
    | 'MEMBER'
    | 'VIEWER';

  const [created] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: ws.id,
      userId: invitee.id,
      role,
      grantedBy: result.context.userId,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role, grantedBy: result.context.userId },
    })
    .returning();

  return NextResponse.json(
    {
      data: created,
      user: { name: invitee.name, email: invitee.email },
    },
    { status: 201 }
  );
}
