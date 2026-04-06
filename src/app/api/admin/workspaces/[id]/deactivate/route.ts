import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaces } from '@/lib/db/schemas/global';
import { eq } from 'drizzle-orm';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;

  const [updated] = await db
    .update(workspaces)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(workspaces.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
