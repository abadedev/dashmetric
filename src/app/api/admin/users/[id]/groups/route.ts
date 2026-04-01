import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import {
  getUserGroups,
  addUserToGroup,
  removeUserFromGroup,
} from '@/lib/services/permission-service';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const data = await getUserGroups(id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:users:groups:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as { groupId: number };

    if (!body.groupId) {
      return NextResponse.json({ error: 'groupId é obrigatório' }, { status: 400 });
    }

    await addUserToGroup(id, body.groupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:users:groups:POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const { id } = await params;
    const body = await req.json() as { groupId: number };

    if (!body.groupId) {
      return NextResponse.json({ error: 'groupId é obrigatório' }, { status: 400 });
    }

    await removeUserFromGroup(id, body.groupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:users:groups:DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
