import { and, count, desc, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { salesRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';
import { buildSalesOverview } from '../sales-service';

function buildSalesFilters(filters: ExternalApiFilters): SQL[] {
  const sqlFilters: SQL[] = [];
  const periodRef = sql<number>`${salesRecords.periodYear} * 100 + ${salesRecords.periodMonth}`;

  if (filters.startDate) {
    const v = filters.startDate.getUTCFullYear() * 100 + (filters.startDate.getUTCMonth() + 1);
    sqlFilters.push(gte(periodRef, v));
  }
  if (filters.endDate) {
    const v = filters.endDate.getUTCFullYear() * 100 + (filters.endDate.getUTCMonth() + 1);
    sqlFilters.push(lte(periodRef, v));
  }
  if (filters.type)   sqlFilters.push(sql`${salesRecords.recordType} = ${filters.type}`);
  if (filters.city)   sqlFilters.push(eq(salesRecords.city, filters.city));
  if (filters.search) sqlFilters.push(ilike(salesRecords.clientName, `%${filters.search}%`));

  return sqlFilters;
}

export async function getSalesAnalytics(filters: ExternalApiFilters) {
  const whereClause = filters.startDate || filters.endDate || filters.type || filters.city || filters.search
    ? and(...buildSalesFilters(filters))
    : undefined;

  // Load full result set for overview aggregation (unique client counts require JS-level processing)
  const [allRows, [countRow], items] = await Promise.all([
    db
      .select({
        recordType:   salesRecords.recordType,
        originSector: salesRecords.originSector,
        csvCategory:  salesRecords.csvCategory,
        clientName:   salesRecords.clientName,
        city:         salesRecords.city,
        source:       salesRecords.source,
      })
      .from(salesRecords)
      .where(whereClause),

    db.select({ total: count() }).from(salesRecords).where(whereClause),

    db
      .select({
        id:          salesRecords.id,
        recordType:  salesRecords.recordType,
        clientName:  salesRecords.clientName,
        city:        salesRecords.city,
        plan:        salesRecords.plan,
        source:      salesRecords.source,
        indication:  salesRecords.indication,
        requestedAt: salesRecords.requestedAt,
        installedAt: salesRecords.installedAt,
        periodMonth: salesRecords.periodMonth,
        periodYear:  salesRecords.periodYear,
      })
      .from(salesRecords)
      .where(whereClause)
      .orderBy(desc(salesRecords.requestedAt), desc(salesRecords.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);

  const overview = buildSalesOverview(allRows);

  return {
    totals:  overview.totals,
    byType:  overview.byType,
    byCity:  overview.byCity,
    bySource: overview.bySource,
    items,
    pagination: {
      page:     filters.page,
      limit:    filters.limit,
      returned: items.length,
      total:    Number(countRow?.total ?? 0),
    },
  };
}
