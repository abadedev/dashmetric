import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { getUserWorkspaces } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response) return response;

  const workspaces = await getUserWorkspaces(session.user.id);

  return NextResponse.json({ data: workspaces });
}
