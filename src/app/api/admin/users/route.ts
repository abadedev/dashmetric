import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { user, userGroups, accessGroups, workspaceMembers } from '@/lib/db/schemas/global';
import { requireWorkspacePermission } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'admin.users.manage');
  if (result.response) return result.response;

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        globalRole: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.name));

    const workspaceMemberships = await db
      .select({
        userId: workspaceMembers.userId,
        workspaceRole: workspaceMembers.role,
        grantedAt: workspaceMembers.grantedAt,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, result.context.workspaceId));

    const groupMemberships = await db
      .select({
        userId: userGroups.userId,
        groupId: accessGroups.id,
        groupName: accessGroups.name,
      })
      .from(userGroups)
      .innerJoin(
        accessGroups,
        and(eq(userGroups.groupId, accessGroups.id), eq(userGroups.workspaceId, accessGroups.workspaceId))
      )
      .where(eq(userGroups.workspaceId, result.context.workspaceId));

    const data = users.map((u) => ({
      ...u,
      workspaceRole: workspaceMemberships.find((membership) => membership.userId === u.id)?.workspaceRole ?? null,
      workspaceGrantedAt: workspaceMemberships.find((membership) => membership.userId === u.id)?.grantedAt ?? null,
      groups: groupMemberships
        .filter((m) => m.userId === u.id)
        .map((m) => ({ id: m.groupId, name: m.groupName })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:users:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
