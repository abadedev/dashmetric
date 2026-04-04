import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { moduleImportProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const { id } = await params;
      const body = await req.json();

      const [updated] = await db
        .update(moduleImportProfiles)
        .set({
          moduleId: Number(body.moduleId),
          profileKey: body.profileKey,
          label: body.label,
          detectorType: body.detectorType,
          parameters: body.parameters || [],
          isActive: body.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(moduleImportProfiles.id, Number(id)))
        .returning();

      return NextResponse.json({ data: updated });
    } catch (error) {
      console.error('[module-import-profiles:patch]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const { id } = await params;
      await db.delete(moduleImportProfiles).where(eq(moduleImportProfiles.id, Number(id)));
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[module-import-profiles:delete]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
