import { and, count, desc, eq, inArray, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import type { ExternalApiFilters } from '@/lib/api/filters';
import {
  buildAttendanceBaseFilters,
  buildAttendanceDateReference,
  buildAttendanceStatusFilter,
  combineFilters,
  getGroupedBucketSql,
  INSTALLATION_TYPES,
} from './common';

function buildAttendanceFilters(filters: ExternalApiFilters, options?: { onlyInstallations?: boolean }) {
  const sqlFilters: SQL[] = [...buildAttendanceBaseFilters(filters)];
  const statusFilter = buildAttendanceStatusFilter(filters.status);
  if (statusFilter) sqlFilters.push(statusFilter);
  if (options?.onlyInstallations) sqlFilters.push(inArray(atendimentos.tipo, [...INSTALLATION_TYPES]));
  return sqlFilters;
}

function buildAttendanceItemsQuery(whereClause: SQL | undefined, limit: number, offset: number) {
  return db
    .select({
      id: atendimentos.id,
      osNumber: atendimentos.numeroOs,
      activityType: atendimentos.tipo,
      clientName: atendimentos.cliente,
      city: atendimentos.cidade,
      plan: atendimentos.plano,
      openedAt: atendimentos.aberturaAt,
      closedAt: atendimentos.finalizacaoAt,
      technicianId: atendimentos.tecnicoId,
      technicianName: atendimentos.tecnico,
      withinSlaUtil: atendimentos.dentroSlaUtil,
      slaUtilSeconds: atendimentos.slaUtilSegundos,
      periodMonth: atendimentos.periodMonth,
      periodYear: atendimentos.periodYear,
    })
    .from(atendimentos)
    .where(whereClause)
    .orderBy(desc(atendimentos.aberturaAt), desc(atendimentos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getInstallationsAnalytics(filters: ExternalApiFilters) {
  const whereClause = combineFilters(buildAttendanceFilters(filters, { onlyInstallations: true }));
  const dateRef = buildAttendanceDateReference();
  const bucket = getGroupedBucketSql(filters.groupBy, dateRef);

  const [[totals], grouped, items, byTechnician] = await Promise.all([
    db
      .select({
        total: count(),
        closed: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        open: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is null then 1 else 0 end) as int)`,
        newInstallations: sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Instalação (Nova)' then 1 else 0 end) as int)`,
        reactivations: sql<number>`cast(sum(case when ${atendimentos.tipo} = 'Instalação (Reativação)' then 1 else 0 end) as int)`,
      })
      .from(atendimentos)
      .where(whereClause),

    db
      .select({
        bucket,
        total: count(),
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(bucket)
      .orderBy(bucket),

    buildAttendanceItemsQuery(whereClause, filters.limit, filters.offset),

    db
      .select({
        technicianId: atendimentos.tecnicoId,
        technicianName: atendimentos.tecnico,
        total: count(),
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(atendimentos.tecnicoId, atendimentos.tecnico)
      .orderBy(sql`count(*) desc`)
      .limit(20),
  ]);

  return {
    totals: {
      total: Number(totals?.total ?? 0),
      open: Number(totals?.open ?? 0),
      closed: Number(totals?.closed ?? 0),
      newInstallations: Number(totals?.newInstallations ?? 0),
      reactivations: Number(totals?.reactivations ?? 0),
    },
    grouped: grouped.map((row) => ({
      bucket: row.bucket,
      total: Number(row.total),
    })),
    byTechnician: byTechnician.map((row) => ({
      technicianId: row.technicianId,
      technicianName: row.technicianName,
      total: Number(row.total),
    })),
    items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      returned: items.length,
      total: Number(totals?.total ?? 0),
    },
  };
}

export async function getAttendancesAnalytics(filters: ExternalApiFilters) {
  const whereClause = combineFilters(buildAttendanceFilters(filters));
  const dateRef = buildAttendanceDateReference();
  const bucket = getGroupedBucketSql(filters.groupBy, dateRef);

  const [[totals], grouped, byType, byTechnician, items] = await Promise.all([
    db
      .select({
        total: count(),
        closed: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        open: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is null then 1 else 0 end) as int)`,
        withinSla: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
        outsideSla: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = false then 1 else 0 end) as int)`,
      })
      .from(atendimentos)
      .where(whereClause),

    db
      .select({
        bucket,
        total: count(),
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(bucket)
      .orderBy(bucket),

    db
      .select({
        type: atendimentos.tipo,
        total: count(),
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(atendimentos.tipo)
      .orderBy(sql`count(*) desc`),

    db
      .select({
        technicianId: atendimentos.tecnicoId,
        technicianName: atendimentos.tecnico,
        total: count(),
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(atendimentos.tecnicoId, atendimentos.tecnico)
      .orderBy(sql`count(*) desc`)
      .limit(20),

    buildAttendanceItemsQuery(whereClause, filters.limit, filters.offset),
  ]);

  return {
    totals: {
      total: Number(totals?.total ?? 0),
      open: Number(totals?.open ?? 0),
      closed: Number(totals?.closed ?? 0),
      withinSlaUtil: Number(totals?.withinSla ?? 0),
      outsideSlaUtil: Number(totals?.outsideSla ?? 0),
    },
    grouped: grouped.map((row) => ({
      bucket: row.bucket,
      total: Number(row.total),
    })),
    byType: byType.map((row) => ({
      type: row.type,
      total: Number(row.total),
    })),
    byTechnician: byTechnician.map((row) => ({
      technicianId: row.technicianId,
      technicianName: row.technicianName,
      total: Number(row.total),
    })),
    items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      returned: items.length,
      total: Number(totals?.total ?? 0),
    },
  };
}

export async function getSlaAnalytics(filters: ExternalApiFilters) {
  const whereClause = combineFilters(buildAttendanceFilters(filters));

  const rows = await db
    .select({
      activityType: atendimentos.tipo,
      slaTargetHours: atendimentos.slaHoras,
      total: count(),
      concluded: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
      withinSlaCorrido: sql<number>`cast(sum(case when ${atendimentos.dentroSla} = true then 1 else 0 end) as int)`,
      withinSlaUtil: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
      avgCorridoSeconds: sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaCorridoSegundos} else null end)`,
      avgUtilSeconds: sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaUtilSegundos} else null end)`,
    })
    .from(atendimentos)
    .where(whereClause)
    .groupBy(atendimentos.tipo, atendimentos.slaHoras)
    .orderBy(atendimentos.tipo);

  const byType = rows.map((row) => {
    const concluded = Number(row.concluded ?? 0);
    const withinSlaUtil = Number(row.withinSlaUtil ?? 0);
    const withinSlaCorrido = Number(row.withinSlaCorrido ?? 0);

    return {
      activityType: row.activityType,
      slaTargetHours: row.slaTargetHours != null ? Number(row.slaTargetHours) : null,
      total: Number(row.total ?? 0),
      concluded,
      withinSlaCorrido,
      withinSlaUtil,
      outsideSlaUtil: Math.max(concluded - withinSlaUtil, 0),
      avgCorridoSeconds: row.avgCorridoSeconds != null ? Math.round(Number(row.avgCorridoSeconds)) : null,
      avgUtilSeconds: row.avgUtilSeconds != null ? Math.round(Number(row.avgUtilSeconds)) : null,
      slaCorridoPercent: concluded > 0 ? Number((withinSlaCorrido / concluded).toFixed(4)) : 0,
      slaUtilPercent: concluded > 0 ? Number((withinSlaUtil / concluded).toFixed(4)) : 0,
    };
  });

  const totals = byType.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.concluded += row.concluded;
      acc.withinSlaCorrido += row.withinSlaCorrido;
      acc.withinSlaUtil += row.withinSlaUtil;
      return acc;
    },
    { total: 0, concluded: 0, withinSlaCorrido: 0, withinSlaUtil: 0 }
  );

  return {
    totals: {
      total: totals.total,
      concluded: totals.concluded,
      withinSlaCorrido: totals.withinSlaCorrido,
      withinSlaUtil: totals.withinSlaUtil,
      outsideSlaUtil: Math.max(totals.concluded - totals.withinSlaUtil, 0),
      avgSlaCorridoPercent: totals.concluded > 0 ? Number((totals.withinSlaCorrido / totals.concluded).toFixed(4)) : 0,
      avgSlaUtilPercent: totals.concluded > 0 ? Number((totals.withinSlaUtil / totals.concluded).toFixed(4)) : 0,
    },
    byType,
  };
}

export async function getAttendanceCounts(filters: ExternalApiFilters) {
  const allWhere = combineFilters(buildAttendanceFilters(filters));
  const installationsWhere = combineFilters(buildAttendanceFilters(filters, { onlyInstallations: true }));

  const [[attendanceRow], [installationRow]] = await Promise.all([
    db.select({ total: count() }).from(atendimentos).where(allWhere),
    db.select({ total: count() }).from(atendimentos).where(installationsWhere),
  ]);

  return {
    attendances: Number(attendanceRow?.total ?? 0),
    installations: Number(installationRow?.total ?? 0),
  };
}
