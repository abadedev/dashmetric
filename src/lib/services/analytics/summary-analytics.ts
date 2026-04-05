import { count, gte, lte, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { qualityRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';
import { getAttendanceCounts, getSlaAnalytics } from './attendance-analytics';
import { getPhoneSupportCounts } from './phone-support-analytics';
import { getSalesOverview } from '../sales-service';
import { getCancellationsOverview } from '../cancellations-service';

export async function getSummaryAnalytics(filters: ExternalApiFilters) {
  const qualityFilters = [];
  if (filters.startDate) qualityFilters.push(gte(qualityRecords.openedAt, filters.startDate));
  if (filters.endDate) qualityFilters.push(lte(qualityRecords.openedAt, filters.endDate));
  const qualityWhere = qualityFilters.length ? and(...qualityFilters) : undefined;

  const [attendanceCounts, phoneSupportCounts, salesOverview, cancellationsOverview, slaOverview, [qualityRow]] =
    await Promise.all([
      getAttendanceCounts(filters),
      getPhoneSupportCounts(filters),
      getSalesOverview({
        from: filters.startDate,
        to: filters.endDate,
        city: filters.city,
        plan: filters.plan,
        source: filters.source,
        search: filters.search,
        type: filters.type,
      }),
      getCancellationsOverview({
        from: filters.startDate,
        to: filters.endDate,
        city: filters.city,
        plan: filters.plan,
        source: filters.source,
        category: filters.category,
        search: filters.search,
      }),
      getSlaAnalytics(filters),
      db.select({ total: count() }).from(qualityRecords).where(qualityWhere),
    ]);

  return {
    totals: {
      installations: attendanceCounts.installations,
      attendances: attendanceCounts.attendances,
      phoneSupports: phoneSupportCounts.totalSupports,
      cancellations: cancellationsOverview.totals.cancelledClients,
      negotiatedClients: salesOverview.totals.negotiatedClients,
      closedClients: salesOverview.totals.closedClients,
      outsideBusinessHoursClosedClients: salesOverview.totals.outsideBusinessHoursClosedClients,
      installedOrders: salesOverview.totals.installedOrders,
      cancelledOrders: salesOverview.totals.cancelledOrders,
      qualityRecords: Number(qualityRow?.total ?? 0),
    },
    sales: salesOverview.totals,
    cancellations: cancellationsOverview.totals,
    sla: slaOverview.totals,
  };
}
