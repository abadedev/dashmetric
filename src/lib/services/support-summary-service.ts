import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportCallCategories, supportRecords } from '@/lib/db/schema';

export type SupportTypeSummaryItem = {
  tipo: string;
  quantidade: number;
  percentual: number;
};

export type SupportTypeSummaryResult = {
  summary: SupportTypeSummaryItem[];
  total: number;
  triageByAttendant: Array<{
    attendantName: string;
    openedManutExt: number;
    withoutManut: number;
    total: number;
    sharePercent: number;
  }>;
};

type SupportSummaryFilters = {
  from?: Date | null;
  to?: Date | null;
  workspaceId?: string | null;
};

function toPeriodValue(date: Date) {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

export async function getSupportTypeSummary(
  filters: SupportSummaryFilters = {}
): Promise<SupportTypeSummaryResult> {
  const where = [];

  if (filters.workspaceId) {
    where.push(eq(supportCallCategories.workspaceId, filters.workspaceId));
  }

  if (filters.from) {
    where.push(
      gte(
        sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
        toPeriodValue(filters.from)
      )
    );
  }

  if (filters.to) {
    where.push(
      lte(
        sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
        toPeriodValue(filters.to)
      )
    );
  }

  const rows = await db
    .select({
      categoria: supportCallCategories.categoria,
      quantidade: supportCallCategories.quantidade,
    })
    .from(supportCallCategories)
    .where(where.length ? and(...where) : undefined);

  const supportWhere = [];

  if (filters.workspaceId) {
    supportWhere.push(eq(supportRecords.workspaceId, filters.workspaceId));
  }

  if (filters.from) {
    supportWhere.push(
      gte(
        sql<number>`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth}`,
        toPeriodValue(filters.from)
      )
    );
  }

  if (filters.to) {
    supportWhere.push(
      lte(
        sql<number>`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth}`,
        toPeriodValue(filters.to)
      )
    );
  }

  const supportRows = await db
    .select({
      attendantName: supportRecords.attendantName,
      openedManutExt: supportRecords.openedManutExt,
      withoutManut: supportRecords.withoutManut,
      total: supportRecords.total,
      periodMonth: supportRecords.periodMonth,
      periodYear: supportRecords.periodYear,
    })
    .from(supportRecords)
    .where(supportWhere.length ? and(...supportWhere) : undefined)
    .orderBy(desc(supportRecords.periodYear), desc(supportRecords.periodMonth));

  const total = rows.reduce((acc, row) => acc + Number(row.quantidade ?? 0), 0);

  const summary = Array.from(
    rows.reduce<Map<string, number>>((acc, row) => {
      const categoria = row.categoria?.trim();
      if (!categoria) return acc;

      acc.set(categoria, (acc.get(categoria) ?? 0) + Number(row.quantidade ?? 0));
      return acc;
    }, new Map()).entries()
  )
    .map(([tipo, quantidade]) => ({
      tipo,
      quantidade,
      percentual: total > 0 ? Number(((quantidade / total) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));

  const triageByAttendant = Array.from(
    supportRows.reduce<Map<string, { openedManutExt: number; withoutManut: number; total: number }>>((acc, row) => {
      const name = row.attendantName?.trim();
      if (!name) return acc;

      const current = acc.get(name) ?? { openedManutExt: 0, withoutManut: 0, total: 0 };
      current.openedManutExt += Number(row.openedManutExt ?? 0);
      current.withoutManut += Number(row.withoutManut ?? 0);
      current.total += Number(row.total ?? 0);
      acc.set(name, current);
      return acc;
    }, new Map()).entries()
  )
    .map(([attendantName, values]) => ({
      attendantName,
      openedManutExt: values.openedManutExt,
      withoutManut: values.withoutManut,
      total: values.total,
      sharePercent: total > 0 ? Number(((values.total / total) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.total - left.total || left.attendantName.localeCompare(right.attendantName));

  return {
    summary,
    total,
    triageByAttendant,
  };
}
