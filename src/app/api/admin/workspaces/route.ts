import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { globalDb as db } from '@/lib/db';
import { workspaces, workspaceMembers } from '@/lib/db/schemas/global';
import { ensureDefaultModules } from '@/lib/services/module-service';
import { eq, count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { response, session } = await requireAdmin(req);
  if (response) return response;

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      logoUrl: workspaces.logoUrl,
      logoDarkUrl: workspaces.logoDarkUrl,
      logoLightUrl: workspaces.logoLightUrl,
      defaultTheme: workspaces.defaultTheme,
      isActive: workspaces.isActive,
      createdAt: workspaces.createdAt,
      createdBy: workspaces.createdBy,
      memberCount: count(workspaceMembers.id),
    })
    .from(workspaces)
    .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .groupBy(workspaces.id);

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const { response, session } = await requireAdmin(req);
  if (response) return response;

  const body = (await req.json()) as {
    name?: string;
    slug?: string;
    logoUrl?: string | null;
    defaultTheme?: 'dark' | 'light';
  };

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: 'name e slug são obrigatórios' }, { status: 400 });
  }

  const slug = body.slug.trim();

  // Check slug uniqueness
  const [existing] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 });
  }

  const [created] = await db
    .insert(workspaces)
    .values({
      name: body.name.trim(),
      slug,
      logoUrl: body.logoUrl ?? null,
      defaultTheme: body.defaultTheme === 'light' ? 'light' : 'dark',
      createdBy: session.user.id,
      updatedAt: new Date(),
    })
    .returning();

  // Creator becomes ADMIN of the new workspace
  await db.insert(workspaceMembers).values({
    workspaceId: created!.id,
    userId: session.user.id,
    role: 'ADMIN',
    grantedBy: session.user.id,
  });

  await ensureDefaultModules(created!.id);

  return NextResponse.json({ data: created }, { status: 201 });
}
