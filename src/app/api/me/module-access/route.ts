import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;

  const { globalRole, workspaceRole, moduleAccess } = result.context;
  return NextResponse.json({ data: { globalRole, workspaceRole, moduleAccess } });
}
