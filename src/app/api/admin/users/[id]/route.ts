import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as { role?: 'user' | 'editor' | 'admin' };

    if (!body.role || !['user', 'editor', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
    }

    const [updated] = await db
      .update(user)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning({ id: user.id, role: user.role });

    if (!updated) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[admin:users:PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
