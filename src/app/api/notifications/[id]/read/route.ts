import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { systemNotificationReads } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;
  const notifId = parseInt(id, 10);
  if (Number.isNaN(notifId)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const userId = auth.session.user.id;

  await db
    .insert(systemNotificationReads)
    .values({ notificationId: notifId, userId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
