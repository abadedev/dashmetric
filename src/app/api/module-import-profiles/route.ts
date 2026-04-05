import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { moduleImportProfiles, systemModules } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const body = await req.json();
    const moduleId = Number(body.moduleId);

    const [moduleRow] = await db
      .select({ id: systemModules.id })
      .from(systemModules)
      .where(and(eq(systemModules.id, moduleId), eq(systemModules.workspaceId, ctx.workspaceId)))
      .limit(1);

    if (!moduleRow) {
      return NextResponse.json({ error: 'Modulo nao pertence ao workspace ativo' }, { status: 404 });
    }

    const [created] = await db
      .insert(moduleImportProfiles)
      .values({
        moduleId,
        profileKey: body.profileKey,
        label: body.label,
        detectorType: body.detectorType,
        parameters: body.parameters || [],
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[module-import-profiles:post]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
