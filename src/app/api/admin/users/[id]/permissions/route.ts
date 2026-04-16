import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import {
  getUserIndividualAccessProfile,
  getUserIndividualPermissions,
  setUserIndividualAccessProfile,
  setUserIndividualPermissions,
} from '@/lib/services/permission-service';
import type { ModuleAccessLevel } from '@/lib/module-access';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.users.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const profile = await getUserIndividualAccessProfile(id, result.context.workspaceId);
    return NextResponse.json({
      data: profile.permissions,
      moduleAccess: profile.moduleAccess,
      globalPermissions: profile.globalPermissions,
    });
  } catch (error) {
    console.error('[admin:users:permissions:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.users.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as {
      permissionIds?: number[];
      globalPermissionIds?: number[];
      moduleAccess?: Record<string, ModuleAccessLevel>;
    };

    if (body.moduleAccess) {
      await setUserIndividualAccessProfile(
        id,
        result.context.workspaceId,
        body.moduleAccess,
        body.globalPermissionIds ?? []
      );
      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(body.permissionIds)) {
      return NextResponse.json({ error: 'permissionIds deve ser um array' }, { status: 400 });
    }

    await setUserIndividualPermissions(id, result.context.workspaceId, body.permissionIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:users:permissions:POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
