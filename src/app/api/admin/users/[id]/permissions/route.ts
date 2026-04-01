import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import {
  getUserIndividualPermissions,
  setUserIndividualPermissions,
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
    const data = await getUserIndividualPermissions(id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:users:permissions:GET]', error);
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
    const body = await req.json() as { permissionIds: number[] };

    if (!Array.isArray(body.permissionIds)) {
      return NextResponse.json({ error: 'permissionIds deve ser um array' }, { status: 400 });
    }

    await setUserIndividualPermissions(id, body.permissionIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:users:permissions:POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
