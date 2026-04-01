import { getCancellationRecordsCollection } from '@/lib/db/mongo';
import type { Filter } from 'mongodb';
import type { CancellationRecordDoc } from '@/lib/db/mongo-types';

export async function getCancellationsOverview(from?: Date | null, to?: Date | null) {
  const col = await getCancellationRecordsCollection();

  const filter: Filter<CancellationRecordDoc> = {};

  if (from || to) {
    const fromVal = from ? from.getFullYear() * 100 + (from.getMonth() + 1) : null;
    const toVal   = to   ? to.getFullYear()   * 100 + (to.getMonth()   + 1) : null;

    // Filtra via campo calculado periodYear*100+periodMonth
    const conditions: Filter<CancellationRecordDoc>[] = [];
    if (fromVal !== null) {
      conditions.push({
        $or: [
          { periodYear: { $gt: Math.floor(fromVal / 100) } },
          {
            periodYear:  Math.floor(fromVal / 100),
            periodMonth: { $gte: fromVal % 100 },
          },
        ],
      } as any);
    }
    if (toVal !== null) {
      conditions.push({
        $or: [
          { periodYear: { $lt: Math.floor(toVal / 100) } },
          {
            periodYear:  Math.floor(toVal / 100),
            periodMonth: { $lte: toVal % 100 },
          },
        ],
      } as any);
    }
    if (conditions.length) (filter as any).$and = conditions;
  }

  const rows = await col.find(filter).toArray();

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
