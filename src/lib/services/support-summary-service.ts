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

function getSupportRowVolume(row: {
  total: number | string | null;
}) {
  const explicitTotal = Number(row.total ?? 0);
  return explicitTotal > 0 ? explicitTotal : 1;
}

function buildSupportDateReference() {
  return sql`COALESCE(${supportRecords.openedAt}, ${supportRecords.closedAt})`;
}

export async function getSupportTypeSummary(
  filters: SupportSummaryFilters = {}
): Promise<SupportTypeSummaryResult> {
  const supportWhere = [];
  const supportDateRef = buildSupportDateReference();

  if (filters.workspaceId) {
    supportWhere.push(eq(supportRecords.workspaceId, filters.workspaceId));
  }

  if (filters.from) {
    supportWhere.push(gte(supportDateRef, filters.from));
  }

  if (filters.to) {
    supportWhere.push(lte(supportDateRef, filters.to));
  }

  const supportRows = await db
    .select({
      attendantName: supportRecords.attendantName,
      supportCategory: supportRecords.supportCategory,
      openedManutExt: supportRecords.openedManutExt,
      withoutManut: supportRecords.withoutManut,
      total: supportRecords.total,
      openedAt: supportRecords.openedAt,
      closedAt: supportRecords.closedAt,
      periodMonth: supportRecords.periodMonth,
      periodYear: supportRecords.periodYear,
    })
    .from(supportRecords)
    .where(supportWhere.length ? and(...supportWhere) : undefined)
    .orderBy(desc(supportRecords.openedAt), desc(supportRecords.closedAt), desc(supportRecords.periodYear), desc(supportRecords.periodMonth));

  const summaryFromRows = Array.from(
    supportRows.reduce<Map<string, number>>((acc, row) => {
      const category = row.supportCategory?.trim();
      if (!category) return acc;

      acc.set(category, (acc.get(category) ?? 0) + getSupportRowVolume(row));
      return acc;
    }, new Map()).entries()
  );

  let categorizedTotal = summaryFromRows.reduce((acc, [, quantidade]) => acc + quantidade, 0);
  const supportTotal = supportRows.reduce((acc, row) => acc + getSupportRowVolume(row), 0);
  let summary = summaryFromRows
    .map(([tipo, quantidade]) => ({
      tipo,
      quantidade,
      percentual: 0,
    }))
    .sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));

  // Legacy fallback: older imports only stored monthly category aggregates.
  if (summary.length === 0) {
    const legacyWhere = [];

    if (filters.workspaceId) {
      legacyWhere.push(eq(supportCallCategories.workspaceId, filters.workspaceId));
    }

    if (filters.from) {
      legacyWhere.push(
        gte(
          sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
          filters.from.getFullYear() * 100 + (filters.from.getMonth() + 1)
        )
      );
    }

    if (filters.to) {
      legacyWhere.push(
        lte(
          sql<number>`${supportCallCategories.periodYear} * 100 + ${supportCallCategories.periodMonth}`,
          filters.to.getFullYear() * 100 + (filters.to.getMonth() + 1)
        )
      );
    }

    const legacyRows = await db
      .select({
        categoria: supportCallCategories.categoria,
        quantidade: supportCallCategories.quantidade,
      })
      .from(supportCallCategories)
      .where(legacyWhere.length ? and(...legacyWhere) : undefined);

    summary = Array.from(
      legacyRows.reduce<Map<string, number>>((acc, row) => {
        const categoria = row.categoria?.trim();
        if (!categoria) return acc;

        acc.set(categoria, (acc.get(categoria) ?? 0) + Number(row.quantidade ?? 0));
        return acc;
      }, new Map()).entries()
    )
      .map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
        percentual: 0,
      }))
      .sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));

    categorizedTotal = summary.reduce((acc, row) => acc + row.quantidade, 0);
  }

  const total = Math.max(categorizedTotal, supportTotal);
  summary = summary.map((item) => ({
    ...item,
    percentual: total > 0 ? Number(((item.quantidade / total) * 100).toFixed(2)) : 0,
  }));

  const uncategorizedCount = Math.max(0, supportTotal - categorizedTotal);
  if (uncategorizedCount > 0) {
    summary.push({
      tipo: 'Nao classificado',
      quantidade: uncategorizedCount,
      percentual: total > 0 ? Number(((uncategorizedCount / total) * 100).toFixed(2)) : 0,
    });
    summary.sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));
  }

  const triageByAttendant = Array.from(
    supportRows.reduce<Map<string, { openedManutExt: number; withoutManut: number; total: number }>>((acc, row) => {
      const name = row.attendantName?.trim();
      if (!name) return acc;

      const current = acc.get(name) ?? { openedManutExt: 0, withoutManut: 0, total: 0 };
      current.openedManutExt += Number(row.openedManutExt ?? 0);
      current.withoutManut += Number(row.withoutManut ?? 0);
      current.total += getSupportRowVolume(row);
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
