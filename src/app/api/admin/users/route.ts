import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { user, userGroups, accessGroups } from '@/lib/db/schemas/global';
import { requireAdmin } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.name));

    // Fetch all user-group memberships with group name
    const memberships = await db
      .select({
        userId: userGroups.userId,
        groupId: accessGroups.id,
        groupName: accessGroups.name,
      })
      .from(userGroups)
      .innerJoin(accessGroups, eq(userGroups.groupId, accessGroups.id));

    const data = users.map((u) => ({
      ...u,
      groups: memberships
        .filter((m) => m.userId === u.id)
        .map((m) => ({ id: m.groupId, name: m.groupName })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin:users:GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
