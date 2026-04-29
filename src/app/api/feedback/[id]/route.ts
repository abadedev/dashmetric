import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/require-auth';

interface Context {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ['pendente', 'ignorado', 'realizado', 'gostei'];

export async function PATCH(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: string };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  await db.update(feedback).set({ status: body.status }).where(eq(feedback.id, Number(id)));

  return NextResponse.json({ success: true });
}
