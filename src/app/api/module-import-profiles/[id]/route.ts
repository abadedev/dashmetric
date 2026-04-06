import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { moduleImportProfiles, systemModules } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.modules.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const profileId = Number(id);
    const moduleId = Number(body.moduleId);

    const [existing] = await db
      .select({ id: moduleImportProfiles.id })
      .from(moduleImportProfiles)
      .innerJoin(systemModules, eq(systemModules.id, moduleImportProfiles.moduleId))
      .where(
        and(
          eq(moduleImportProfiles.id, profileId),
          eq(systemModules.workspaceId, result.context.workspaceId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Perfil nao pertence ao workspace ativo' }, { status: 404 });
    }

    const [targetModule] = await db
      .select({ id: systemModules.id })
      .from(systemModules)
      .where(and(eq(systemModules.id, moduleId), eq(systemModules.workspaceId, result.context.workspaceId)))
      .limit(1);

    if (!targetModule) {
      return NextResponse.json({ error: 'Modulo nao pertence ao workspace ativo' }, { status: 404 });
    }

    const [updated] = await db
      .update(moduleImportProfiles)
      .set({
        moduleId,
        profileKey: body.profileKey,
        label: body.label,
        detectorType: body.detectorType,
        parameters: body.parameters || [],
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(moduleImportProfiles.id, profileId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[module-import-profiles:patch]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.modules.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const profileId = Number(id);

    const [existing] = await db
      .select({ id: moduleImportProfiles.id })
      .from(moduleImportProfiles)
      .innerJoin(systemModules, eq(systemModules.id, moduleImportProfiles.moduleId))
      .where(
        and(
          eq(moduleImportProfiles.id, profileId),
          eq(systemModules.workspaceId, result.context.workspaceId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Perfil nao pertence ao workspace ativo' }, { status: 404 });
    }

    await db.delete(moduleImportProfiles).where(eq(moduleImportProfiles.id, profileId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[module-import-profiles:delete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
