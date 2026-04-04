import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { technicians } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const rows = await db.select().from(technicians).orderBy(technicians.name);
      return NextResponse.json({ data: rows });
    } catch (err) {
      console.error('[technicians]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
