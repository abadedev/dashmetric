import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { requireAdmin, requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response) return response;

  const body = (await req.json()) as { message?: string };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
  }

  const user = session.user as { name?: string; email?: string };

  await db.insert(feedback).values({
    message: body.message.trim(),
    userEmail: user.email ?? null,
    userName: user.name ?? null,
  });

  return NextResponse.json({ success: true });
}
