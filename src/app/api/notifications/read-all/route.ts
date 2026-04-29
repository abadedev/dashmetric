import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { systemNotifications, systemNotificationReads } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const userId = auth.session.user.id;

  const allNotifs = await db
    .select({ id: systemNotifications.id })
    .from(systemNotifications);

  if (allNotifs.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db
    .insert(systemNotificationReads)
    .values(allNotifs.map((n) => ({ notificationId: n.id, userId })))
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
