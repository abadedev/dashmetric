import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { updateGroup, deleteGroup } from '@/lib/services/permission-service';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.groups.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as { name?: string; description?: string };

    const data = await updateGroup(result.context.workspaceId, Number(id), body);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:groups:PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireWorkspacePermission(req, 'admin.groups.manage');
  if (result.response) return result.response;

  try {
    const { id } = await params;
    await deleteGroup(result.context.workspaceId, Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:groups:DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
