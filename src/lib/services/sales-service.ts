import { db } from '@/lib/db';
import { salesRecords } from '@/lib/db/schema';
import { and, gte, ilike, lte, sql, SQL } from 'drizzle-orm';

type SalesOverviewRow = {
  recordType: string;
  originSector: string;
  csvCategory: string;
  clientName: string | null;
  city: string | null;
  source: string | null;
};

function isMarketingSource(source: string | null) {
  return source === 'marketing_digital';
}

function normalizeClientName(value: string | null) {
  return value?.trim() || null;
}

function uniqueClientCount(rows: SalesOverviewRow[]) {
  return new Set(
    rows
      .map((row) => normalizeClientName(row.clientName))
      .filter((value): value is string => Boolean(value))
  ).size;
}

function countByCity(rows: SalesOverviewRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const city = row.city?.trim();
    if (!city) return acc;
    acc[city] = (acc[city] ?? 0) + 1;
    return acc;
  }, {});
}

function countByType(rows: SalesOverviewRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getTypeLabel(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function countBySource(rows: SalesOverviewRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const source = row.source?.trim() || 'nao_informado';
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});
}

function getTypeLabel(row: SalesOverviewRow) {
  if (row.recordType === 'fechado' && row.csvCategory === 'fora_horario') {
    return 'Fechados Fora do Horario';
  }

  const typeLabels: Record<string, string> = {
    negociado: 'Negociados',
    fechado: 'Fechados',
    lead_marketing: 'Leads Marketing',
    pedido_instalado: 'Instalados',
    pedido_cancelado: 'Pedidos Cancelados',
  };

  return typeLabels[row.recordType] || row.recordType;
}

export function buildSalesOverview(rows: SalesOverviewRow[]) {
  const standardNegotiatedRows = rows.filter(
    (row) => row.recordType === 'negociado' && row.originSector === 'vendas' && row.csvCategory === 'padrao'
  );
  const standardClosedRows = rows.filter(
    (row) => row.recordType === 'fechado' && row.originSector === 'vendas' && row.csvCategory === 'padrao'
  );
  const outsideBusinessHoursRows = rows.filter(
    (row) => row.recordType === 'fechado' && row.originSector === 'vendas' && row.csvCategory === 'fora_horario'
  );
  const marketingLeadRows = rows.filter(
    (row) => row.recordType === 'lead_marketing' || isMarketingSource(row.source)
  );
  const installedRows = rows.filter(
    (row) => row.recordType === 'pedido_instalado' && row.originSector === 'vendas'
  );
  const cancelledOrderRows = rows.filter(
    (row) => row.recordType === 'pedido_cancelado' && row.originSector === 'vendas'
  );

  const negotiatedCount = uniqueClientCount(standardNegotiatedRows);
  const standardClosedCount = uniqueClientCount(standardClosedRows);
  const outsideBusinessHoursCount = uniqueClientCount(outsideBusinessHoursRows);

  return {
    totals: {
      negotiatedClients: negotiatedCount,
      closedClients: standardClosedCount,
      outsideBusinessHoursClosedClients: outsideBusinessHoursCount,
      marketingLeads: uniqueClientCount(marketingLeadRows),
      installedOrders: installedRows.length,
      cancelledOrders: cancelledOrderRows.length,
      conversionRate: negotiatedCount > 0 ? Number((standardClosedCount / negotiatedCount).toFixed(4)) : 0,
    },
    byCity: Object.entries(countByCity(rows))
      .map(([city, total]) => ({ city, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 10),
    byType: Object.entries(countByType(rows))
      .map(([type, total]) => ({ type, total }))
      .sort((left, right) => right.total - left.total),
    bySource: Object.entries(countBySource(rows))
      .map(([source, total]) => ({ source, total }))
      .sort((left, right) => right.total - left.total),
  };
}

export interface SalesOverviewFilters {
  from?: Date | null;
  to?: Date | null;
  city?: string | null;
  plan?: string | null;
  source?: string | null;
  search?: string | null;
  type?: string | null;
}

export async function getSalesOverview(filtersInput: SalesOverviewFilters = {}) {
  const filters: SQL[] = [];
  const { from, to, city, plan, source, search, type } = filtersInput;

  if (from) {
    const fromVal = from.getFullYear() * 100 + (from.getMonth() + 1);
    filters.push(gte(sql<number>`${salesRecords.periodYear} * 100 + ${salesRecords.periodMonth}`, fromVal));
  }

  if (to) {
    const toVal = to.getFullYear() * 100 + (to.getMonth() + 1);
    filters.push(lte(sql<number>`${salesRecords.periodYear} * 100 + ${salesRecords.periodMonth}`, toVal));
  }

  if (city) filters.push(ilike(salesRecords.city, `%${city}%`));
  if (plan) filters.push(ilike(salesRecords.plan, `%${plan}%`));
  if (source) filters.push(ilike(salesRecords.source, `%${source}%`));
  if (type) filters.push(sql`${salesRecords.recordType} = ${type}`);
  if (search) {
    filters.push(
      sql`(
        ${ilike(salesRecords.clientName, `%${search}%`)}
        OR ${ilike(salesRecords.indication, `%${search}%`)}
        OR ${ilike(salesRecords.plan, `%${search}%`)}
        OR ${ilike(salesRecords.observation, `%${search}%`)}
      )`
    );
  }

  const rows = await db
    .select({
      recordType: salesRecords.recordType,
      originSector: salesRecords.originSector,
      csvCategory: salesRecords.csvCategory,
      clientName: salesRecords.clientName,
      city: salesRecords.city,
      source: salesRecords.source,
    })
    .from(salesRecords)
    .where(filters.length ? and(...filters) : undefined);

  return buildSalesOverview(rows);
}
