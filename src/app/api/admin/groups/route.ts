import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { listGroups, createGroup } from '@/lib/services/permission-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const data = await listGroups();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:groups:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const body = await req.json() as { name: string; description?: string };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const data = await createGroup(body.name.trim(), body.description?.trim());
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[admin:groups:POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
