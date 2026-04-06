import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { setGroupPermissions } from '@/lib/services/permission-service';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.groups.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as { permissionIds: number[] };

    if (!Array.isArray(body.permissionIds)) {
      return NextResponse.json({ error: 'permissionIds deve ser um array' }, { status: 400 });
    }

    await setGroupPermissions(result.context.workspaceId, Number(id), body.permissionIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:groups:permissions:POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
