import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaces } from '@/lib/db/schemas/global';
import { eq } from 'drizzle-orm';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string; logoUrl?: string | null };

  const [updated] = await db
    .update(workspaces)
    .set({
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
    })
    .where(eq(workspaces.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function POST(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;
  const url = new URL(req.url);

  // POST /api/admin/workspaces/[id]/deactivate
  if (url.pathname.endsWith('/deactivate')) {
    const [updated] = await db
      .update(workspaces)
      .set({ isActive: false })
      .where(eq(workspaces.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
