import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import { and, eq, gte, lte, SQL } from 'drizzle-orm';

export async function getCancellationsOverview(from?: Date | null, to?: Date | null) {
  const filters: SQL[] = [eq(cancellationRecords.originSector, 'retencao')];

  if (from) filters.push(gte(cancellationRecords.cancelledAt, from));
  if (to)   filters.push(lte(cancellationRecords.cancelledAt, to));

  const whereClause = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      city:        cancellationRecords.city,
      reason:      cancellationRecords.reason,
      observation: cancellationRecords.observation,
    })
    .from(cancellationRecords)
    .where(whereClause);

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
      cities:           Object.keys(byCity).length,
      mappedReasons:    Object.keys(byReason).length,
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
