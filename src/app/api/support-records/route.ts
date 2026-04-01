import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportCallCategories } from '@/lib/db/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const filters = [];

    if (fromStr) {
      const fDate = new Date(fromStr);
      const fromVal = fDate.getFullYear() * 100 + (fDate.getMonth() + 1);
      filters.push(
        gte(
          sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
          fromVal
        )
      );
    }

    if (toStr) {
      const tDate = new Date(toStr);
      const toVal = tDate.getFullYear() * 100 + (tDate.getMonth() + 1);
      filters.push(
        lte(
          sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
          toVal
        )
      );
    }

    const rows = await db
      .select()
      .from(supportCallCategories)
      .where(filters.length ? and(...filters) : undefined);

    const total = rows.reduce((acc, row) => acc + Number(row.quantidade ?? 0), 0);
    const groupedRows = Array.from(
      rows.reduce<Map<string, number>>((acc, row) => {
        const categoria = row.categoria;
        const quantidade = Number(row.quantidade ?? 0);
        acc.set(categoria, (acc.get(categoria) ?? 0) + quantidade);
        return acc;
      }, new Map()).entries()
    );

    const data = groupedRows
      .map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
        percentual: total > 0 ? Number(((quantidade / total) * 100).toFixed(2)) : 0,
      }))
      .sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));

    return NextResponse.json({
      data,
      total,
    });
  } catch (err) {
    console.error('[support-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
