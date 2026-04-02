import { and, count, desc, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { qualityRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';

function buildQualityFilters(filters: ExternalApiFilters): SQL[] {
  const sqlFilters: SQL[] = [];

  if (filters.startDate) sqlFilters.push(gte(qualityRecords.openedAt, filters.startDate));
  if (filters.endDate)   sqlFilters.push(lte(qualityRecords.openedAt, filters.endDate));
  if (filters.type)      sqlFilters.push(sql`${qualityRecords.indicator} = ${filters.type}`);
  if (filters.city)      sqlFilters.push(eq(qualityRecords.city, filters.city));
  if (filters.technicianId) sqlFilters.push(eq(qualityRecords.technicianId, filters.technicianId));
  if (filters.search) {
    sqlFilters.push(
      sql`(${ilike(qualityRecords.clientName, `%${filters.search}%`)} OR ${ilike(qualityRecords.technicianName, `%${filters.search}%`)})`
    );
  }

  return sqlFilters;
}

export async function getQualityAnalytics(filters: ExternalApiFilters) {
  const where = buildQualityFilters(filters);
  const whereClause = where.length ? and(...where) : undefined;

  const [[countRow], byIndicatorRaw, byCityRaw, byTechnicianRaw, items] = await Promise.all([
    db.select({ total: count() }).from(qualityRecords).where(whereClause),

    db
      .select({
        indicator: qualityRecords.indicator,
        total:     count(),
        avgDurationSeconds: sql<number>`avg(${qualityRecords.durationSeconds})`,
      })
      .from(qualityRecords)
      .where(whereClause)
      .groupBy(qualityRecords.indicator)
      .orderBy(sql`count(*) desc`),

    db
      .select({ city: qualityRecords.city, total: count() })
      .from(qualityRecords)
      .where(whereClause)
      .groupBy(qualityRecords.city)
      .orderBy(sql`count(*) desc`)
      .limit(15),

    db
      .select({
        technicianName: qualityRecords.technicianName,
        total:          count(),
      })
      .from(qualityRecords)
      .where(whereClause)
      .groupBy(qualityRecords.technicianName)
      .orderBy(sql`count(*) desc`)
      .limit(20),

    db
      .select({
        id:              qualityRecords.id,
        osNumber:        qualityRecords.osNumber,
        indicator:       qualityRecords.indicator,
        reason:          qualityRecords.reason,
        technicianName:  qualityRecords.technicianName,
        clientName:      qualityRecords.clientName,
        city:            qualityRecords.city,
        plan:            qualityRecords.plan,
        openedAt:        qualityRecords.openedAt,
        closedAt:        qualityRecords.closedAt,
        durationSeconds: qualityRecords.durationSeconds,
        periodMonth:     qualityRecords.periodMonth,
        periodYear:      qualityRecords.periodYear,
      })
      .from(qualityRecords)
      .where(whereClause)
      .orderBy(desc(qualityRecords.openedAt), desc(qualityRecords.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);

  const total = Number(countRow?.total ?? 0);

  return {
    totals: {
      total,
      indicators: byIndicatorRaw.length,
    },
    byIndicator: byIndicatorRaw.map((r) => ({
      indicator:          r.indicator,
      total:              Number(r.total),
      avgDurationSeconds: r.avgDurationSeconds != null ? Math.round(Number(r.avgDurationSeconds)) : null,
    })),
    byCity:       byCityRaw.map((r) => ({ city: r.city ?? 'Não informado', total: Number(r.total) })),
    byTechnician: byTechnicianRaw.map((r) => ({ technicianName: r.technicianName ?? 'Não informado', total: Number(r.total) })),
    items,
    pagination: {
      page:     filters.page,
      limit:    filters.limit,
      returned: items.length,
      total,
    },
  };
}
