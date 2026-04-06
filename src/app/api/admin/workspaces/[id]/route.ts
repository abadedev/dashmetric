import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { workspaces } from '@/lib/db/schemas/global';
import { requireAdmin } from '@/lib/require-auth';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, ctx: Context) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    logoUrl?: string | null;
    defaultTheme?: 'dark' | 'light';
  };

  const [updated] = await db
    .update(workspaces)
    .set({
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      ...(body.defaultTheme ? { defaultTheme: body.defaultTheme === 'light' ? 'light' : 'dark' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
