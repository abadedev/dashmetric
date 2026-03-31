import { db } from '@/lib/db';
import { serviceOrders, technicians } from '@/lib/db/schema';
import { count, sql, eq, desc, and } from 'drizzle-orm';
import { formatSLATime } from './sla-engine';

export async function getRanking(filters?: { month?: number; year?: number }) {
  const periodFilter = [];
  if (filters?.month)
    periodFilter.push(eq(serviceOrders.periodMonth, filters.month));
  if (filters?.year)
    periodFilter.push(eq(serviceOrders.periodYear, filters.year));

  const ranking = await db
    .select({
      technicianId: technicians.id,
      technicianName: technicians.name,
      totalOS: count(),
      instNova: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'instalacao_nova')`,
      instReativacao: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'instalacao_reativacao')`,
      reparo: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'reparo')`,
      mudancaEndereco: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'mudanca_endereco')`,
      retiradaKit: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'retirada_kit')`,
      mudancaPlano: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'mudanca_plano')`,
      retorno: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.activityType} = 'retorno')`,
      withinSlaUtil: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.withinSlaUtil} = true)`,
      concluded: sql<number>`COUNT(*) FILTER (WHERE ${serviceOrders.closedAt} IS NOT NULL)`,
      avgSlaUtilSeconds: sql<number>`AVG(${serviceOrders.slaUtilSeconds}) FILTER (WHERE ${serviceOrders.closedAt} IS NOT NULL)`,
    })
    .from(serviceOrders)
    .innerJoin(technicians, eq(serviceOrders.technicianId, technicians.id))
    .where(and(...periodFilter))
    .groupBy(technicians.id, technicians.name)
    .orderBy(desc(count()));

  return ranking.map((r, i) => ({
    position: i + 1,
    ...r,
    avgSlaUtilFormatted: formatSLATime(
      Math.floor(Number(r.avgSlaUtilSeconds) || 0)
    ),
    slaUtilPercent:
      r.concluded > 0
        ? Math.round((r.withinSlaUtil / r.concluded) * 100)
        : null,
    isTop5: i < 5,
  }));
}
