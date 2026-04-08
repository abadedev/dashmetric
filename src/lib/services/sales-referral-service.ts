import { db } from '@/lib/db';
import { salesReferralRecords } from '@/lib/db/schema';
import { and, count, desc, eq, gte, ilike, lte, sql, SQL, asc } from 'drizzle-orm';

export interface SalesReferralFilters {
  workspaceId: string;
  from?: Date | null;
  to?: Date | null;
  city?: string | null;
  search?: string | null;
  status?: string | null;
  page?: number | null;
  pageSize?: number | null;
}

function buildFilters(filtersInput: SalesReferralFilters) {
  const filters: SQL[] = [eq(salesReferralRecords.workspaceId, filtersInput.workspaceId)];

  if (filtersInput.from) {
    const fromVal = filtersInput.from.getFullYear() * 100 + (filtersInput.from.getMonth() + 1);
    filters.push(gte(sql<number>`${salesReferralRecords.periodYear} * 100 + ${salesReferralRecords.periodMonth}`, fromVal));
  }

  if (filtersInput.to) {
    const toVal = filtersInput.to.getFullYear() * 100 + (filtersInput.to.getMonth() + 1);
    filters.push(lte(sql<number>`${salesReferralRecords.periodYear} * 100 + ${salesReferralRecords.periodMonth}`, toVal));
  }

  if (filtersInput.city) filters.push(ilike(salesReferralRecords.cidade, `%${filtersInput.city}%`));
  if (filtersInput.status) filters.push(eq(salesReferralRecords.status, filtersInput.status as 'contratado' | 'pendente' | 'reprovado'));
  if (filtersInput.search) {
    filters.push(
      sql`(
        ${ilike(salesReferralRecords.indicante, `%${filtersInput.search}%`)}
        OR ${ilike(salesReferralRecords.indicado, `%${filtersInput.search}%`)}
        OR ${ilike(salesReferralRecords.contratado, `%${filtersInput.search}%`)}
        OR ${ilike(salesReferralRecords.telefoneIndicado, `%${filtersInput.search}%`)}
      )`
    );
  }

  return filters;
}

export async function getSalesReferralOverview(filtersInput: SalesReferralFilters) {
  const filters = buildFilters(filtersInput);
  const whereClause = and(...filters);
  const page = Math.max(1, filtersInput.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filtersInput.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const [summaryRows, totalRows, records] = await Promise.all([
    db
      .select({
        status: salesReferralRecords.status,
        total: count(),
      })
      .from(salesReferralRecords)
      .where(whereClause)
      .groupBy(salesReferralRecords.status),
    db
      .select({ total: count() })
      .from(salesReferralRecords)
      .where(whereClause),
    db
      .select({
        id: salesReferralRecords.id,
        cadastroAt: salesReferralRecords.cadastroAt,
        indicante: salesReferralRecords.indicante,
        indicado: salesReferralRecords.indicado,
        contratado: salesReferralRecords.contratado,
        telefoneIndicado: salesReferralRecords.telefoneIndicado,
        cidade: salesReferralRecords.cidade,
        status: salesReferralRecords.status,
        rawStatus: salesReferralRecords.rawStatus,
        periodMonth: salesReferralRecords.periodMonth,
        periodYear: salesReferralRecords.periodYear,
      })
      .from(salesReferralRecords)
      .where(whereClause)
      .orderBy(desc(salesReferralRecords.cadastroAt), asc(salesReferralRecords.indicado), asc(salesReferralRecords.id))
      .limit(pageSize)
      .offset(offset),
  ]);

  const summary = summaryRows.reduce(
    (acc, row) => {
      acc[row.status] = Number(row.total);
      return acc;
    },
    {
      contratado: 0,
      pendente: 0,
      reprovado: 0,
    } as Record<'contratado' | 'pendente' | 'reprovado', number>
  );

  const total = Number(totalRows[0]?.total ?? 0);
  const conversionRate = total > 0 ? Number((summary.contratado / total).toFixed(4)) : 0;

  return {
    summary: {
      total,
      contratado: summary.contratado,
      pendente: summary.pendente,
      reprovado: summary.reprovado,
      conversionRate,
    },
    records,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
