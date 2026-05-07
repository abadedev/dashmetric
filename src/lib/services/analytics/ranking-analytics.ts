import { and, count, desc, eq, isNotNull, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { atendimentos, supportRecords } from '@/lib/db/schema';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import type { ExternalApiFilters } from '@/lib/api/filters';
import {
  buildAttendanceBaseFilters,
  buildAttendanceDateReference,
  combineFilters,
} from './common';

const EXCLUDED_FIRST_NAMES = ['Fernanda', 'Vitor', 'Ramon', 'Thiago'];
const EXCLUDED_TECHNICIAN_NAMES = new Set([
  'Andre Phylipe',
  'Davi Borges',
  'Hyan Levi',
  'Kaique Pinheiro',
  'Valdir Rocha',
  'Arthur Alves',
  'Luiz Amorim',
  'Pedro Nascimento',
  'Leonardo Khalil',
  'Guilherme Santos',
  'Patrick Kretli',
  'Keven Miranda',
  'Davi Guimaraes',
]);

function canonicalizeTechnicianName(name: string | null | undefined) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function resolveTechnicianAlias(canonical: string) {
  if (!canonical) return '';
  if (canonical === 'lucas mendona a') return 'lucas mendonca';
  if (canonical === 'juscelino cruz') return 'juscelino da cruz';
  return canonical;
}

function toDisplayTechnicianName(name: string | null | undefined) {
  const canonical = resolveTechnicianAlias(canonicalizeTechnicianName(name));
  if (!canonical) return '';
  if (canonical === 'lucas mendonca') return 'Lucas Mendonca';
  if (canonical === 'juscelino da cruz') return 'Juscelino Da Cruz';

  return canonical
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isExcludedTechnicianName(name: string | null | undefined) {
  return EXCLUDED_TECHNICIAN_NAMES.has(toDisplayTechnicianName(name));
}

export async function getRankingAnalytics(filters: ExternalApiFilters) {
  const dateFilters: SQL[] = [...buildAttendanceBaseFilters(filters)];
  const excludedFilter = sql`split_part(${atendimentos.tecnico}, ' ', 1) NOT IN (${sql.join(EXCLUDED_FIRST_NAMES.map((name) => sql`${name}`), sql`, `)})`;
  const rankingFilters: SQL[] = [...dateFilters, isNotNull(atendimentos.tecnicoId), excludedFilter];
  const whereClause = combineFilters(rankingFilters);

  const supportFilters: SQL[] = [];
  if (filters.workspaceId) supportFilters.push(eq(supportRecords.workspaceId, filters.workspaceId));
  // Filtra por periodo — sempre preenchido, independente de openedAt/closedAt serem nulos.
  if (filters.startDate) supportFilters.push(sql`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth} >= ${filters.startDate.getFullYear() * 100 + (filters.startDate.getMonth() + 1)}`);
  if (filters.endDate) supportFilters.push(sql`${supportRecords.periodYear} * 100 + ${supportRecords.periodMonth} <= ${filters.endDate.getFullYear() * 100 + (filters.endDate.getMonth() + 1)}`);
  const supportWhere = supportFilters.length ? and(...supportFilters) : undefined;

  const [technicianRows, attendantRows] = await Promise.all([
    db
      .select({
        technicianId: atendimentos.tecnicoId,
        technicianName: atendimentos.tecnico,
        totalOS: count(),
        concluded: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        withinSlaCorrido: sql<number>`cast(sum(case when ${atendimentos.dentroSla} = true then 1 else 0 end) as int)`,
        withinSlaUtil: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
        avgSlaCorridoSeg: sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaCorridoSegundos} else null end)`,
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
        totalSupports: sql<number>`cast(sum(case when coalesce(${supportRecords.total}, 0) > 0 then ${supportRecords.total} else 1 end) as int)`,
        totalWithoutManut: sql<number>`cast(sum(${supportRecords.withoutManut}) as int)`,
        totalOpenedManutExt: sql<number>`cast(sum(${supportRecords.openedManutExt}) as int)`,
      })
      .from(supportRecords)
      .where(supportWhere)
      .groupBy(supportRecords.attendantName)
      .orderBy(desc(sql`sum(case when coalesce(${supportRecords.total}, 0) > 0 then ${supportRecords.total} else 1 end)`))
      .limit(Math.min(filters.limit, 100)),
  ]);

  const mergedTechnicians = Array.from(
    technicianRows.reduce<
      Map<string, {
        technicianId: number | null;
        technicianKey: string;
        technicianName: string;
        totalOS: number;
        concluded: number;
        withinSlaCorrido: number;
        withinSlaUtil: number;
        avgSlaCorridoWeightedTotal: number;
        avgSlaUtilWeightedTotal: number;
      }>
    >((acc, row) => {
      const technicianName = toDisplayTechnicianName(row.technicianName);
      if (!technicianName || isExcludedTechnicianName(technicianName)) return acc;
      const technicianKey = resolveTechnicianAlias(canonicalizeTechnicianName(technicianName));
      if (!technicianKey) return acc;
      const technicianId = row.technicianId != null ? Number(row.technicianId) : null;

      const current = acc.get(technicianKey) ?? {
        technicianId,
        technicianKey,
        technicianName,
        totalOS: 0,
        concluded: 0,
        withinSlaCorrido: 0,
        withinSlaUtil: 0,
        avgSlaCorridoWeightedTotal: 0,
        avgSlaUtilWeightedTotal: 0,
      };

      if (current.technicianId == null && technicianId != null) {
        current.technicianId = technicianId;
      }
      current.technicianName = current.technicianName.length >= technicianName.length
        ? current.technicianName
        : technicianName;
      current.totalOS += Number(row.totalOS ?? 0);
      current.concluded += Number(row.concluded ?? 0);
      current.withinSlaCorrido += Number(row.withinSlaCorrido ?? 0);
      current.withinSlaUtil += Number(row.withinSlaUtil ?? 0);
      current.avgSlaCorridoWeightedTotal += (Number(row.avgSlaCorridoSeg) || 0) * Number(row.concluded ?? 0);
      current.avgSlaUtilWeightedTotal += (Number(row.avgSlaUtilSeg) || 0) * Number(row.concluded ?? 0);
      acc.set(technicianKey, current);
      return acc;
    }, new Map()).values()
  )
    .sort((left, right) => right.totalOS - left.totalOS || left.technicianName.localeCompare(right.technicianName));

  return {
    technicians: mergedTechnicians.map((row, index) => ({
      position: index + 1,
      technicianId: row.technicianId,
      technicianKey: row.technicianKey,
      technicianName: row.technicianName,
      totalOS: row.totalOS,
      concluded: row.concluded,
      withinSla: row.withinSlaCorrido,
      withinSlaCorrido: row.withinSlaCorrido,
      withinSlaUtil: row.withinSlaUtil,
      avgSlaFormatted: formatSecondsToHHMMSS(
        Math.floor(row.concluded > 0 ? row.avgSlaCorridoWeightedTotal / row.concluded : 0)
      ),
      avgSlaUtilFormatted: formatSecondsToHHMMSS(
        Math.floor(row.concluded > 0 ? row.avgSlaUtilWeightedTotal / row.concluded : 0)
      ),
      slaPercent:
        row.concluded > 0
          ? Math.round((row.withinSlaCorrido / row.concluded) * 100)
          : null,
      slaUtilPercent:
        row.concluded > 0
          ? Math.round((row.withinSlaUtil / row.concluded) * 100)
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
