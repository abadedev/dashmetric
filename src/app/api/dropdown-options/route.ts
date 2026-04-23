import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { dropdownOptions } from '@/lib/db/schema';
import { asc, eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const rows = await db
    .select()
    .from(dropdownOptions)
    .where(
      category
        ? and(eq(dropdownOptions.category, category), eq(dropdownOptions.isActive, true))
        : eq(dropdownOptions.isActive, true)
    )
    .orderBy(asc(dropdownOptions.sortOrder), asc(dropdownOptions.label));

  return NextResponse.json({ data: rows });
}
