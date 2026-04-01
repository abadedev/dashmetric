import { db } from '@/lib/db';
import { salesRecords } from '@/lib/db/schema';
import { and, gte, lte, sql } from 'drizzle-orm';

function isMarketingSource(source: string | null) {
  return source === 'marketing_digital';
}

export async function getSalesOverview(from?: Date | null, to?: Date | null) {
  const filters = [];

  if (from) {
    const fromVal = from.getFullYear() * 100 + (from.getMonth() + 1);
    filters.push(gte(sql<number>`${salesRecords.periodYear} * 100 + ${salesRecords.periodMonth}`, fromVal));
  }

  if (to) {
    const toVal = to.getFullYear() * 100 + (to.getMonth() + 1);
    filters.push(lte(sql<number>`${salesRecords.periodYear} * 100 + ${salesRecords.periodMonth}`, toVal));
  }

  const rows = await db
    .select()
    .from(salesRecords)
    .where(filters.length ? and(...filters) : undefined);

  const negotiatedClients = new Set(
    rows
      .filter((row) => row.recordType === 'negociado' || row.recordType === 'fechado' || row.recordType === 'pedido_instalado')
      .map((row) => row.clientName?.trim())
      .filter((value): value is string => Boolean(value))
  );

  const closedClients = new Set(
    rows
      .filter((row) => row.recordType === 'fechado' || row.recordType === 'pedido_instalado')
      .map((row) => row.clientName?.trim())
      .filter((value): value is string => Boolean(value))
  );

  const marketingLeads = new Set(
    rows
      .filter((row) => isMarketingSource(row.source))
      .map((row) => row.clientName?.trim())
      .filter((value): value is string => Boolean(value))
  );

  const installedOrders = rows.filter((row) => row.recordType === 'pedido_instalado').length;
  const cancelledOrders = rows.filter((row) => row.recordType === 'pedido_cancelado').length;

  const byCity = rows.reduce<Record<string, number>>((acc, row) => {
    const city = row.city?.trim();
    if (!city) return acc;
    acc[city] = (acc[city] ?? 0) + 1;
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    negociado: 'Negociados',
    fechado: 'Fechados',
    lead_marketing: 'Leads Marketing',
    pedido_instalado: 'Instalados',
    pedido_cancelado: 'Cancelados',
  };

  const byType = rows.reduce<Record<string, number>>((acc, row) => {
    const key = typeLabels[row.recordType] || row.recordType;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const bySource = rows.reduce<Record<string, number>>((acc, row) => {
    const source = row.source?.trim() || 'nao_informado';
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  const negotiatedCount = negotiatedClients.size;
  const closedCount = closedClients.size;

  return {
    totals: {
      negotiatedClients: negotiatedCount,
      closedClients: closedCount,
      marketingLeads: marketingLeads.size,
      installedOrders,
      cancelledOrders,
      conversionRate: negotiatedCount > 0 ? Number((closedCount / negotiatedCount).toFixed(4)) : 0,
    },
    byCity: Object.entries(byCity)
      .map(([city, total]) => ({ city, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 10),
    byType: Object.entries(byType)
      .map(([type, total]) => ({ type, total }))
      .sort((left, right) => right.total - left.total),
    bySource: Object.entries(bySource)
      .map(([source, total]) => ({ source, total }))
      .sort((left, right) => right.total - left.total),
  };
}
