import { and, count, desc, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';

function buildCancellationFilters(filters: ExternalApiFilters): SQL[] {
  const sqlFilters: SQL[] = [eq(cancellationRecords.originSector, 'retencao')];

  if (filters.workspaceId) sqlFilters.push(eq(cancellationRecords.workspaceId, filters.workspaceId));
  if (filters.startDate) sqlFilters.push(gte(cancellationRecords.cancelledAt, filters.startDate));
  if (filters.endDate)   sqlFilters.push(lte(cancellationRecords.cancelledAt, filters.endDate));
  if (filters.city)      sqlFilters.push(ilike(cancellationRecords.city, `%${filters.city}%`));
  if (filters.plan)      sqlFilters.push(ilike(cancellationRecords.plan, `%${filters.plan}%`));
  if (filters.source)    sqlFilters.push(ilike(cancellationRecords.source, `%${filters.source}%`));
  if (filters.category)  sqlFilters.push(ilike(cancellationRecords.reason, `%${filters.category}%`));
  if (filters.search) {
    sqlFilters.push(
      sql`(
        ${ilike(cancellationRecords.clientName, `%${filters.search}%`)}
        OR ${ilike(cancellationRecords.reason, `%${filters.search}%`)}
        OR ${ilike(cancellationRecords.observation, `%${filters.search}%`)}
        OR ${ilike(cancellationRecords.plan, `%${filters.search}%`)}
      )`
    );
  }

  return sqlFilters;
}

export async function getCancellationsAnalytics(filters: ExternalApiFilters) {
  const where = buildCancellationFilters(filters);
  const whereClause = where.length ? and(...where) : undefined;

  const [[countRow], byReasonRaw, byCityRaw, items] = await Promise.all([
    db.select({ total: count() }).from(cancellationRecords).where(whereClause),

    db
      .select({
        reason: cancellationRecords.reason,
        total:  count(),
      })
      .from(cancellationRecords)
      .where(whereClause)
      .groupBy(cancellationRecords.reason)
      .orderBy(sql`count(*) desc`)
      .limit(20),

    db
      .select({
        city:  cancellationRecords.city,
        total: count(),
      })
      .from(cancellationRecords)
      .where(whereClause)
      .groupBy(cancellationRecords.city)
      .orderBy(sql`count(*) desc`)
      .limit(20),

    db
      .select({
        id:          cancellationRecords.id,
        clientName:  cancellationRecords.clientName,
        city:        cancellationRecords.city,
        status:      cancellationRecords.status,
        reason:      cancellationRecords.reason,
        source:      cancellationRecords.source,
        plan:        cancellationRecords.plan,
        observation: cancellationRecords.observation,
        cancelledAt: cancellationRecords.cancelledAt,
        periodMonth: cancellationRecords.periodMonth,
        periodYear:  cancellationRecords.periodYear,
      })
      .from(cancellationRecords)
      .where(whereClause)
      .orderBy(desc(cancellationRecords.cancelledAt), desc(cancellationRecords.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);

  const total = Number(countRow?.total ?? 0);

  return {
    totals: {
      cancelledClients: total,
      cities:  byCityRaw.filter((r) => r.city).length,
      reasons: byReasonRaw.filter((r) => r.reason).length,
    },
    byReason: byReasonRaw.map((r) => ({ reason: r.reason ?? 'Não informado', total: Number(r.total) })),
    byCity:   byCityRaw.map((r) => ({ city: r.city ?? 'Não informado',   total: Number(r.total) })),
    items,
    pagination: {
      page:     filters.page,
      limit:    filters.limit,
      returned: items.length,
      total,
    },
  };
}
