import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import { and, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';

export interface CancellationOverviewFilters {
  from?: Date | null;
  to?: Date | null;
  city?: string | null;
  plan?: string | null;
  source?: string | null;
  category?: string | null;
  search?: string | null;
}

export async function getCancellationsOverview(filtersInput: CancellationOverviewFilters = {}) {
  const { from, to, city, plan, source, category, search } = filtersInput;
  const filters: SQL[] = [eq(cancellationRecords.originSector, 'retencao')];

  if (from) filters.push(gte(cancellationRecords.cancelledAt, from));
  if (to)   filters.push(lte(cancellationRecords.cancelledAt, to));
  if (city) filters.push(ilike(cancellationRecords.city, `%${city}%`));
  if (plan) filters.push(ilike(cancellationRecords.plan, `%${plan}%`));
  if (source) filters.push(ilike(cancellationRecords.source, `%${source}%`));
  if (category) filters.push(ilike(cancellationRecords.reason, `%${category}%`));
  if (search) {
    filters.push(
      sql`(
        ${ilike(cancellationRecords.clientName, `%${search}%`)}
        OR ${ilike(cancellationRecords.reason, `%${search}%`)}
        OR ${ilike(cancellationRecords.observation, `%${search}%`)}
        OR ${ilike(cancellationRecords.plan, `%${search}%`)}
      )`
    );
  }

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
