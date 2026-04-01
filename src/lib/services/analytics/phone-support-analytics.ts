import { desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportCallCategories, supportRecords } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';
import { buildMonthlyPeriodFilter, combineFilters } from './common';

export async function getPhoneSupportAnalytics(filters: ExternalApiFilters) {
  const supportWhere = combineFilters(
    buildMonthlyPeriodFilter(filters, supportRecords.periodMonth, supportRecords.periodYear)
  );
  const categoriesWhere = combineFilters(
    buildMonthlyPeriodFilter(filters, supportCallCategories.periodMonth, supportCallCategories.periodYear)
  );

  const [rows, categoryRows] = await Promise.all([
    db
      .select({
        attendantName: supportRecords.attendantName,
        openedManutExt: supportRecords.openedManutExt,
        percentage: supportRecords.percentage,
        withoutManut: supportRecords.withoutManut,
        total: supportRecords.total,
        periodMonth: supportRecords.periodMonth,
        periodYear: supportRecords.periodYear,
      })
      .from(supportRecords)
      .where(supportWhere)
      .orderBy(desc(supportRecords.periodYear), desc(supportRecords.periodMonth))
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
      .where(categoriesWhere),
  ]);

  const totalSupports = rows.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
  const totalOpenedManutExt = rows.reduce((acc, row) => acc + Number(row.openedManutExt ?? 0), 0);
  const totalWithoutManut = rows.reduce((acc, row) => acc + Number(row.withoutManut ?? 0), 0);

  const byAttendant = Array.from(
    rows.reduce<Map<string, { total: number; openedManutExt: number; withoutManut: number }>>((acc, row) => {
      const current = acc.get(row.attendantName) ?? { total: 0, openedManutExt: 0, withoutManut: 0 };
      current.total += Number(row.total ?? 0);
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

  const totalCategoryCount = categoryRows.reduce((acc, row) => acc + Number(row.quantidade ?? 0), 0);
  const byCategory = Array.from(
    categoryRows.reduce<Map<string, number>>((acc, row) => {
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
      total: Number(row.total ?? 0),
      periodMonth: row.periodMonth,
      periodYear: row.periodYear,
    })),
  };
}

export async function getPhoneSupportCounts(filters: ExternalApiFilters) {
  const whereClause = combineFilters(
    buildMonthlyPeriodFilter(filters, supportRecords.periodMonth, supportRecords.periodYear)
  );

  const [row] = await db
    .select({
      totalSupports: sql<number>`cast(sum(${supportRecords.total}) as int)`,
      attendants: sql<number>`cast(count(distinct ${supportRecords.attendantName}) as int)`,
    })
    .from(supportRecords)
    .where(whereClause);

  return {
    totalSupports: Number(row?.totalSupports ?? 0),
    attendants: Number(row?.attendants ?? 0),
  };
}
