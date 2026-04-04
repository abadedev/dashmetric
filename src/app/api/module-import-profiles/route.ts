import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { moduleImportProfiles } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
  try {
    const body = await req.json();

    const [created] = await db
      .insert(moduleImportProfiles)
      .values({
        moduleId: Number(body.moduleId),
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
