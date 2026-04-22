import { and, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';
import { atendimentos, supportCallCategories, supportRecords } from '@/lib/db/schema';
import type { ExternalApiFilters, ExternalGroupBy } from '@/lib/api/filters';

export const INSTALLATION_TYPES = ['Instalação (Nova)', 'Instalação (Reativação)'] as const;

// Filtro de data: prioriza finalizacaoAt; fallback para aberturaAt e createdAt
export function buildAttendanceDateReference() {
  return sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
}

export function buildAttendanceBaseFilters(filters: ExternalApiFilters): SQL[] {
  const sqlFilters: SQL[] = [];
  const dateRef = buildAttendanceDateReference();

  if (filters.workspaceId) sqlFilters.push(eq(atendimentos.workspaceId, filters.workspaceId));
  if (filters.startDate) sqlFilters.push(sql`${dateRef} >= ${filters.startDate}`);
  if (filters.endDate) sqlFilters.push(sql`${dateRef} <= ${filters.endDate}`);
  if (filters.type) sqlFilters.push(eq(atendimentos.tipo, filters.type));
  if (filters.technicianId) sqlFilters.push(eq(atendimentos.tecnicoId, filters.technicianId));
  if (filters.city) sqlFilters.push(ilike(atendimentos.cidade, `%${filters.city}%`));
  if (filters.plan) sqlFilters.push(ilike(atendimentos.plano, `%${filters.plan}%`));
  if (filters.bairro) sqlFilters.push(ilike(atendimentos.bairro, `%${filters.bairro}%`));
  if (filters.source) sqlFilters.push(ilike(atendimentos.indicacao, `%${filters.source}%`));
  if (filters.search) {
    sqlFilters.push(
      sql`(
        ${ilike(atendimentos.numeroOs, `%${filters.search}%`)}
        OR ${ilike(atendimentos.cliente, `%${filters.search}%`)}
        OR ${ilike(atendimentos.endereco, `%${filters.search}%`)}
        OR ${ilike(atendimentos.bairro, `%${filters.search}%`)}
        OR ${ilike(atendimentos.plano, `%${filters.search}%`)}
        OR ${ilike(atendimentos.telefones, `%${filters.search}%`)}
      )`
    );
  }

  return sqlFilters;
}

export function buildAttendanceStatusFilter(status: ExternalApiFilters['status']): SQL | null {
  if (status === 'open') return sql`${atendimentos.finalizacaoAt} is null`;
  if (status === 'closed') return sql`${atendimentos.finalizacaoAt} is not null`;
  if (status === 'ok') return eq(atendimentos.dentroSlaUtil, true);
  if (status === 'nok') return eq(atendimentos.dentroSlaUtil, false);
  return null;
}

export function combineFilters(filters: SQL[]) {
  return filters.length ? and(...filters) : undefined;
}

export function getGroupedBucketSql(groupBy: ExternalGroupBy, dateRef: SQL) {
  if (groupBy === 'week') {
    return sql<string>`to_char(date_trunc('week', ${dateRef}), 'YYYY-MM-DD')`;
  }

  if (groupBy === 'month') {
    return sql<string>`to_char(date_trunc('month', ${dateRef}), 'YYYY-MM')`;
  }

  return sql<string>`to_char(date_trunc('day', ${dateRef}), 'YYYY-MM-DD')`;
}

export function buildPeriodInteger(date: Date) {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

export function buildMonthlyPeriodFilter(
  filters: ExternalApiFilters,
  periodMonthColumn: typeof supportRecords.periodMonth | typeof supportCallCategories.periodMonth,
  periodYearColumn: typeof supportRecords.periodYear | typeof supportCallCategories.periodYear
) {
  const sqlFilters: SQL[] = [];
  const periodRef = sql<number>`${periodYearColumn} * 100 + ${periodMonthColumn}`;

  if (filters.workspaceId) {
    if (periodMonthColumn === supportRecords.periodMonth) {
      sqlFilters.push(eq(supportRecords.workspaceId, filters.workspaceId));
    } else {
      sqlFilters.push(eq(supportCallCategories.workspaceId, filters.workspaceId));
    }
  }
  if (filters.startDate) sqlFilters.push(gte(periodRef, buildPeriodInteger(filters.startDate)));
  if (filters.endDate) sqlFilters.push(lte(periodRef, buildPeriodInteger(filters.endDate)));

  return sqlFilters;
}
