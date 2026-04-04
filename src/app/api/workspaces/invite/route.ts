import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaces, workspaceMembers, user } from '@/lib/db/schemas/global';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * POST /api/workspaces/invite
 * Simplified invite: workspace ADMIN sends invite by email.
 * Body: { workspaceSlug: string, email: string, role?: 'MEMBER' | 'VIEWER' | 'ADMIN' }
 */
export async function POST(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response) return response;

  const body = (await req.json()) as {
    workspaceSlug?: string;
    email?: string;
    role?: string;
  };

  if (!body.workspaceSlug || !body.email) {
    return NextResponse.json({ error: 'workspaceSlug e email são obrigatórios' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  // Find workspace
  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(and(eq(workspaces.slug, body.workspaceSlug), eq(workspaces.isActive, true)))
    .limit(1);

  if (!ws) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  }

  // Check requester is ADMIN of this workspace
  const [requesterMembership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);

  const isGlobalAdmin = (session.user as { role?: string }).role === 'admin';
  if (!isGlobalAdmin && requesterMembership?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão para convidar neste workspace' }, { status: 403 });
  }

  // Find user by email
  const [invitee] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!invitee) {
    return NextResponse.json(
      { error: `Nenhum usuário encontrado com o email "${email}". O usuário precisa ter feito login pelo menos uma vez.` },
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
      grantedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role, grantedBy: session.user.id },
    })
    .returning();

  return NextResponse.json({
    data: created,
    user: { name: invitee.name, email: invitee.email },
  }, { status: 201 });
}
