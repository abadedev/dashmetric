import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { systemNotifications, systemNotificationReads } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const userId = auth.session.user.id;

  const notifications = await db
    .select()
    .from(systemNotifications)
    .orderBy(desc(systemNotifications.createdAt));

  if (notifications.length === 0) {
    return NextResponse.json({ data: [], unreadCount: 0 });
  }

  const notifIds = notifications.map((n) => n.id);
  const reads = await db
    .select({ notificationId: systemNotificationReads.notificationId })
    .from(systemNotificationReads)
    .where(
      and(
        inArray(systemNotificationReads.notificationId, notifIds),
        eq(systemNotificationReads.userId, userId)
      )
    );

  const readSet = new Set(reads.map((r) => r.notificationId));

  const data = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    feedbackId: n.feedbackId,
    createdAt: n.createdAt,
    createdBy: n.createdBy,
    isRead: readSet.has(n.id),
  }));

  return NextResponse.json({ data, unreadCount: data.filter((n) => !n.isRead).length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
  const feedbackId = typeof body.feedbackId === 'number' ? body.feedbackId : null;

  if (!title || !bodyText) {
    return NextResponse.json({ error: 'Título e corpo são obrigatórios.' }, { status: 400 });
  }

  const createdBy = auth.session.user.email ?? auth.session.user.name ?? 'admin';

  const [created] = await db
    .insert(systemNotifications)
    .values({ title, body: bodyText, feedbackId, createdBy })
    .returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
