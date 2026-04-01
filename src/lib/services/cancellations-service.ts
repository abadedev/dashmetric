import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import { and, gte, lte, sql } from 'drizzle-orm';

export async function getCancellationsOverview(from?: Date | null, to?: Date | null) {
  const filters = [];

  if (from) {
    const fromVal = from.getFullYear() * 100 + (from.getMonth() + 1);
    filters.push(
      gte(sql<number>`${cancellationRecords.periodYear} * 100 + ${cancellationRecords.periodMonth}`, fromVal)
    );
  }

  if (to) {
    const toVal = to.getFullYear() * 100 + (to.getMonth() + 1);
    filters.push(
      lte(sql<number>`${cancellationRecords.periodYear} * 100 + ${cancellationRecords.periodMonth}`, toVal)
    );
  }

  const rows = await db
    .select()
    .from(cancellationRecords)
    .where(filters.length ? and(...filters) : undefined);

  const byCity = rows.reduce<Record<string, number>>((acc, row) => {
    const city = row.city?.trim() || 'Não informado';
    acc[city] = (acc[city] ?? 0) + 1;
    return acc;
  }, {});

  const byReason = rows.reduce<Record<string, number>>((acc, row) => {
    const reason = row.reason?.trim() || row.observation?.trim() || 'Não informado';
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totals: {
      cancelledClients: rows.length,
      cities: Object.keys(byCity).length,
      mappedReasons: Object.keys(byReason).length,
    },
    byCity: Object.entries(byCity)
      .map(([city, total]) => ({ city, total }))
      .sort((left, right) => right.total - left.total),
    byReason: Object.entries(byReason)
      .map(([reason, total]) => ({ reason, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 10),
  };
}
