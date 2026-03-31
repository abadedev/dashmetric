import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { technicians } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(technicians)
      .orderBy(technicians.name);
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
