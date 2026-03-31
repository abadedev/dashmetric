import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportRecords } from '@/lib/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const filters = [];
    
    if (fromStr) {
      const fDate = new Date(fromStr);
      const fromVal = fDate.getFullYear() * 100 + (fDate.getMonth() + 1);
      filters.push(gte(sql<number>`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth}`, fromVal));
    }
    if (toStr) {
      const tDate = new Date(toStr);
      const toVal = tDate.getFullYear() * 100 + (tDate.getMonth() + 1);
      filters.push(lte(sql<number>`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth}`, toVal));
    }

    const rows = await db
      .select()
      .from(supportRecords)
      .where(and(...filters));

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
