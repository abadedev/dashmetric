import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { systemNotifications } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const { id } = await params;
  const notifId = parseInt(id, 10);
  if (Number.isNaN(notifId)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const [deleted] = await db
    .delete(systemNotifications)
    .where(eq(systemNotifications.id, notifId))
    .returning({ id: systemNotifications.id });

  if (!deleted) {
    return NextResponse.json({ error: 'Notificação não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
