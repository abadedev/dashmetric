import { globalDb } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schemas/global';
import { eq, and } from 'drizzle-orm';
import type { WorkspaceMember } from '@/lib/db/schemas/global';
import { NextResponse } from 'next/server';

export async function assertWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember> {
  const member = await globalDb.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
  if (!member) {
    throw new Error('UNAUTHORIZED');
  }
  return member;
}

export async function assertWorkspaceAdmin(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember> {
  const member = await assertWorkspaceMember(workspaceId, userId);
  if (member.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return member;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
