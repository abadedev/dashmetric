import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportCallCategories, supportRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';

function getSupportRowVolume(row: {
  total: number | string | null;
}) {
  const explicitTotal = Number(row.total ?? 0);
  return explicitTotal > 0 ? explicitTotal : 1;
}

function toPeriodValue(date: Date) {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

function buildSupportDateReference() {
  return sql`COALESCE(${supportRecords.closedAt}, ${supportRecords.openedAt}, make_timestamp(${supportRecords.periodYear}, ${supportRecords.periodMonth}, 1, 0, 0, 0))`;
}

function toUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function toUtcDayEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function buildSupportFilters(filters: ExternalApiFilters) {
  const supportFilters = [];
  const supportDateRef = buildSupportDateReference();

  if (filters.workspaceId) supportFilters.push(eq(supportRecords.workspaceId, filters.workspaceId));
  if (filters.startDate) supportFilters.push(gte(supportDateRef, toUtcDayStart(filters.startDate)));
  if (filters.endDate) supportFilters.push(lte(supportDateRef, toUtcDayEnd(filters.endDate)));

  return supportFilters;
}

export async function getPhoneSupportAnalytics(filters: ExternalApiFilters) {
  const supportFilters = buildSupportFilters(filters);
  const legacyCategoryFilters = [];

  if (filters.workspaceId) legacyCategoryFilters.push(eq(supportCallCategories.workspaceId, filters.workspaceId));
  if (filters.startDate) {
    legacyCategoryFilters.push(
      gte(
        sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
        toPeriodValue(filters.startDate)
      )
    );
  }
  if (filters.endDate) {
    legacyCategoryFilters.push(
      lte(
        sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
        toPeriodValue(filters.endDate)
      )
    );
  }

  const supportWhere = supportFilters.length ? and(...supportFilters) : undefined;

  const [rows, legacyCategoryRows] = await Promise.all([
    db
      .select({
        attendantName: supportRecords.attendantName,
        supportCategory: supportRecords.supportCategory,
        openedManutExt: supportRecords.openedManutExt,
        percentage: supportRecords.percentage,
        withoutManut: supportRecords.withoutManut,
        total: supportRecords.total,
        openedAt: supportRecords.openedAt,
        closedAt: supportRecords.closedAt,
        periodMonth: supportRecords.periodMonth,
        periodYear: supportRecords.periodYear,
      })
      .from(supportRecords)
      .where(supportWhere)
      .orderBy(desc(supportRecords.closedAt), desc(supportRecords.openedAt), desc(supportRecords.periodYear), desc(supportRecords.periodMonth))
      .limit(Math.min(filters.limit, 100)),

    db
      .select({
        categoria: supportCallCategories.categoria,
        quantidade: supportCallCategories.quantidade,
        percentual: supportCallCategories.percentual,
        periodMonth: supportCallCategories.periodMonth,
        periodYear: supportCallCategories.periodYear,
      })
      .from(supportCallCategories)
      .where(legacyCategoryFilters.length ? and(...legacyCategoryFilters) : undefined),
  ]);

  const totalSupports = rows.reduce((acc, row) => acc + getSupportRowVolume(row), 0);
  const totalOpenedManutExt = rows.reduce((acc, row) => acc + Number(row.openedManutExt ?? 0), 0);
  const totalWithoutManut = rows.reduce((acc, row) => acc + Number(row.withoutManut ?? 0), 0);

  const byAttendant = Array.from(
    rows.reduce<Map<string, { total: number; openedManutExt: number; withoutManut: number }>>((acc, row) => {
      const current = acc.get(row.attendantName) ?? { total: 0, openedManutExt: 0, withoutManut: 0 };
      current.total += getSupportRowVolume(row);
      current.openedManutExt += Number(row.openedManutExt ?? 0);
      current.withoutManut += Number(row.withoutManut ?? 0);
      acc.set(row.attendantName, current);
      return acc;
    }, new Map()).entries()
  )
    .map(([attendantName, totals]) => ({
      attendantName,
      total: totals.total,
      openedManutExt: totals.openedManutExt,
      withoutManut: totals.withoutManut,
      sharePercent: totalSupports > 0 ? Number(((totals.total / totalSupports) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.total - left.total || left.attendantName.localeCompare(right.attendantName));

  let byCategory = Array.from(
    rows.reduce<Map<string, number>>((acc, row) => {
      const category = row.supportCategory?.trim();
      if (!category) return acc;
      acc.set(category, (acc.get(category) ?? 0) + getSupportRowVolume(row));
      return acc;
    }, new Map()).entries()
  )
    .map(([category, total]) => ({
      category,
      total,
      sharePercent: totalSupports > 0 ? Number(((total / totalSupports) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.total - left.total || left.category.localeCompare(right.category));

  if (byCategory.length === 0) {
    const totalCategoryCount = legacyCategoryRows.reduce((acc, row) => acc + Number(row.quantidade ?? 0), 0);
    byCategory = Array.from(
      legacyCategoryRows.reduce<Map<string, number>>((acc, row) => {
        acc.set(row.categoria, (acc.get(row.categoria) ?? 0) + Number(row.quantidade ?? 0));
        return acc;
      }, new Map()).entries()
    )
      .map(([category, total]) => ({
        category,
        total,
        sharePercent: totalCategoryCount > 0 ? Number(((total / totalCategoryCount) * 100).toFixed(2)) : 0,
      }))
      .sort((left, right) => right.total - left.total || left.category.localeCompare(right.category));
  }

  return {
    totals: {
      totalSupports,
      totalOpenedManutExt,
      totalWithoutManut,
      attendants: byAttendant.length,
      categories: byCategory.length,
    },
    byAttendant,
    byCategory,
    records: rows.map((row) => ({
      attendantName: row.attendantName,
      openedManutExt: Number(row.openedManutExt ?? 0),
      percentage: row.percentage != null ? Number(row.percentage) : null,
      withoutManut: Number(row.withoutManut ?? 0),
      total: getSupportRowVolume(row),
      periodMonth: row.periodMonth,
      periodYear: row.periodYear,
    })),
  };
}

export async function getPhoneSupportCounts(filters: ExternalApiFilters) {
  const supportFilters = buildSupportFilters(filters);
  const whereClause = supportFilters.length ? and(...supportFilters) : undefined;

  const [row] = await db
    .select({
      totalSupports: sql<number>`cast(sum(case when coalesce(${supportRecords.total}, 0) > 0 then ${supportRecords.total} else 1 end) as int)`,
      attendants: sql<number>`cast(count(distinct ${supportRecords.attendantName}) as int)`,
    })
    .from(supportRecords)
    .where(whereClause);

  return {
    totalSupports: Number(row?.totalSupports ?? 0),
    attendants: Number(row?.attendants ?? 0),
  };
}
