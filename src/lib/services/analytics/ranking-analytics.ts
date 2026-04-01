import { count, desc, eq, isNotNull, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { atendimentos, supportRecords } from '@/lib/db/schema';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import type { ExternalApiFilters } from '@/lib/api/filters';
import {
  buildAttendanceBaseFilters,
  buildAttendanceDateReference,
  buildMonthlyPeriodFilter,
  combineFilters,
} from './common';

const EXCLUDED_FIRST_NAMES = ['Fernanda', 'Vitor', 'Ramon', 'Thiago'];

export async function getRankingAnalytics(filters: ExternalApiFilters) {
  const dateFilters: SQL[] = [...buildAttendanceBaseFilters(filters)];
  const excludedFilter = sql`split_part(${atendimentos.tecnico}, ' ', 1) NOT IN (${sql.join(EXCLUDED_FIRST_NAMES.map((name) => sql`${name}`), sql`, `)})`;
  const rankingFilters: SQL[] = [...dateFilters, isNotNull(atendimentos.tecnicoId), excludedFilter];
  const whereClause = combineFilters(rankingFilters);

  const supportWhere = combineFilters(
    buildMonthlyPeriodFilter(filters, supportRecords.periodMonth, supportRecords.periodYear)
  );

  const [technicianRows, attendantRows] = await Promise.all([
    db
      .select({
        technicianId: atendimentos.tecnicoId,
        technicianName: atendimentos.tecnico,
        totalOS: count(),
        concluded: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        withinSlaUtil: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
        avgSlaUtilSeg: sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaUtilSegundos} else null end)`,
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(atendimentos.tecnicoId, atendimentos.tecnico)
      .orderBy(sql`count(*) desc`)
      .limit(Math.min(filters.limit, 100)),

    db
      .select({
        attendantName: supportRecords.attendantName,
        totalSupports: sql<number>`cast(sum(${supportRecords.total}) as int)`,
        totalWithoutManut: sql<number>`cast(sum(${supportRecords.withoutManut}) as int)`,
        totalOpenedManutExt: sql<number>`cast(sum(${supportRecords.openedManutExt}) as int)`,
      })
      .from(supportRecords)
      .where(supportWhere)
      .groupBy(supportRecords.attendantName)
      .orderBy(desc(sql`sum(${supportRecords.total})`))
      .limit(Math.min(filters.limit, 100)),
  ]);

  return {
    technicians: technicianRows.map((row, index) => ({
      position: index + 1,
      technicianId: row.technicianId,
      technicianName: row.technicianName,
      totalOS: Number(row.totalOS),
      concluded: Number(row.concluded ?? 0),
      withinSlaUtil: Number(row.withinSlaUtil ?? 0),
      avgSlaUtilFormatted: formatSecondsToHHMMSS(Math.floor(Number(row.avgSlaUtilSeg) || 0)),
      slaUtilPercent:
        Number(row.concluded ?? 0) > 0
          ? Math.round((Number(row.withinSlaUtil ?? 0) / Number(row.concluded ?? 0)) * 100)
          : null,
    })),
    attendants: attendantRows.map((row, index) => ({
      position: index + 1,
      attendantName: row.attendantName,
      totalSupports: Number(row.totalSupports ?? 0),
      totalWithoutManut: Number(row.totalWithoutManut ?? 0),
      totalOpenedManutExt: Number(row.totalOpenedManutExt ?? 0),
    })),
  };
}
