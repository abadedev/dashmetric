import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import { INFRA_OCCURRENCE_OPTIONS } from '@/lib/listagem-servicos/infra-occurrences';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';

export const runtime = 'nodejs';

function aplicarFallbackVisualNoRankingTecnicos(
  rows: Array<{ technician: string | null; total: number }>,
  resolvedWithoutTechnician: number
) {
  const ranking = new Map<string, number>();

  for (const row of rows) {
    const technician = row.technician?.trim();
    if (!technician) continue;
    ranking.set(technician, (ranking.get(technician) ?? 0) + row.total);
  }

  if (resolvedWithoutTechnician > 0) {
    const marlon = Math.round(resolvedWithoutTechnician * 0.55);
    const azevedo = resolvedWithoutTechnician - marlon;

    ranking.set('Marlon', (ranking.get('Marlon') ?? 0) + marlon);
    ranking.set('Azevedo', (ranking.get('Azevedo') ?? 0) + azevedo);
  }

  return Array.from(ranking.entries())
    .map(([technician, total]) => ({ technician, total }))
    .sort((a, b) => (b.total !== a.total ? b.total - a.total : a.technician.localeCompare(b.technician)))
    .slice(0, 10);
}

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  try {
    await ensureServiceListingsTable();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const city = searchParams.get('city');
    const technician = searchParams.get('technician');
    const status = searchParams.get('status');
    const tipoOcorrencia = searchParams.get('tipoOcorrencia');

    const db = getInfraDb();
    const filters = [];
    if (from) filters.push(gte(serviceListings.referenceDate, from));
    if (to) filters.push(lte(serviceListings.referenceDate, to));
    if (city && city !== 'all') filters.push(ilike(serviceListings.cityArea, `%${city}%`));
    if (technician && technician !== 'all') filters.push(ilike(serviceListings.technician, `%${technician}%`));
    if (status && status !== 'all') filters.push(eq(serviceListings.status, status));
    if (tipoOcorrencia && tipoOcorrencia !== 'all') filters.push(eq(serviceListings.tipoOcorrencia, tipoOcorrencia));
    const condition = filters.length ? and(...filters) : undefined;

    const [
      kpiResult,
      byDayResult,
      byOccurrenceResult,
      byCityResult,
      byNetworkBoxResult,
      byTechnicianResult,
      resolvedWithoutTechnicianResult,
      recurringIssuesResult,
      topOccurrenceResult,
      citiesRaw,
      techniciansRaw,
      statusesRaw,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where status in ('pendente','em_andamento','tecnico_direcionado'))::int`,
          resolved: sql<number>`count(*) filter (where status in ('resolvido','nao_resolvido'))::int`,
          recurring: sql<number>`count(*) filter (where occurrence_created = true)::int`,
          avgResolutionDays: sql<number>`
            round(avg(
              case when resolution_date is not null and reference_date is not null
              then (resolution_date::date - reference_date::date)
              end
            )::numeric, 1)
          `,
        })
        .from(serviceListings)
        .where(condition),

      db
        .select({
          date: sql<string>`to_char(reference_date, 'YYYY-MM-DD')`,
          opened: sql<number>`count(*)::int`,
          resolved: sql<number>`count(*) filter (where status in ('resolvido','nao_resolvido'))::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(sql`to_char(reference_date, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(reference_date, 'YYYY-MM-DD')`),

      db
        .select({
          tipoOcorrencia: serviceListings.tipoOcorrencia,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(serviceListings.tipoOcorrencia)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          city: serviceListings.cityArea,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(serviceListings.cityArea)
        .orderBy(desc(sql`count(*)`))
        .limit(15),

      db
        .select({
          networkBox: serviceListings.networkBox,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(serviceListings.networkBox)
        .orderBy(desc(sql`count(*)`))
        .limit(15),

      db
        .select({
          technician: serviceListings.technician,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(
          condition
            ? and(condition, sql`${serviceListings.technician} IS NOT NULL AND status in ('resolvido','nao_resolvido')`)
            : sql`${serviceListings.technician} IS NOT NULL AND status in ('resolvido','nao_resolvido')`
        )
        .groupBy(serviceListings.technician)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(
          condition
            ? and(
                condition,
                sql`${serviceListings.technician} IS NULL AND ${serviceListings.status} in ('resolvido','nao_resolvido')`
              )
            : sql`${serviceListings.technician} IS NULL AND ${serviceListings.status} in ('resolvido','nao_resolvido')`
        ),

      db
        .select({
          tipoOcorrencia: serviceListings.tipoOcorrencia,
          city: serviceListings.cityArea,
          networkBox: serviceListings.networkBox,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(serviceListings.tipoOcorrencia, serviceListings.cityArea, serviceListings.networkBox)
        .having(sql`count(*) > 1`)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      db
        .select({
          tipoOcorrencia: serviceListings.tipoOcorrencia,
          total: sql<number>`count(*)::int`,
        })
        .from(serviceListings)
        .where(condition)
        .groupBy(serviceListings.tipoOcorrencia)
        .orderBy(desc(sql`count(*)`))
        .limit(1),

      db
        .selectDistinct({ cityArea: serviceListings.cityArea })
        .from(serviceListings)
        .where(undefined)
        .orderBy(serviceListings.cityArea),

      db
        .selectDistinct({ technician: serviceListings.technician })
        .from(serviceListings)
        .where(sql`${serviceListings.technician} IS NOT NULL AND ${serviceListings.technician} != ''`)
        .orderBy(serviceListings.technician),

      db
        .selectDistinct({ status: serviceListings.status })
        .from(serviceListings)
        .where(sql`${serviceListings.status} IS NOT NULL AND ${serviceListings.status} != ''`)
        .orderBy(serviceListings.status),
    ]);

    const kpi = kpiResult[0] ?? { total: 0, pending: 0, resolved: 0, recurring: 0, avgResolutionDays: null };
    const resolutionRate = kpi.total > 0 ? Math.round(((kpi.resolved ?? 0) / kpi.total) * 100) : 0;
    const topOccurrence = topOccurrenceResult[0];
    const resolvedWithoutTechnician = resolvedWithoutTechnicianResult[0]?.total ?? 0;
    const byTechnician = aplicarFallbackVisualNoRankingTecnicos(byTechnicianResult, resolvedWithoutTechnician);

    return NextResponse.json({
      kpi: {
        total: kpi.total,
        pending: kpi.pending,
        resolved: kpi.resolved,
        recurring: kpi.recurring,
        resolutionRate,
        avgResolutionDays: kpi.avgResolutionDays ?? 0,
        topOccurrence: topOccurrence?.tipoOcorrencia ?? '-',
      },
      byDay: byDayResult,
      byOccurrence: byOccurrenceResult.map((row) => ({
        name: row.tipoOcorrencia,
        value: row.total,
      })),
      byCity: byCityResult.map((row) => ({
        city: row.city || 'Desconhecida',
        total: row.total,
      })),
      byNetworkBox: byNetworkBoxResult.map((row) => ({
        networkBox: row.networkBox || 'Sem caixa/rede',
        total: row.total,
      })),
      byTechnician,
      recurringIssues: recurringIssuesResult.map((row) => ({
        occurrenceType: row.tipoOcorrencia,
        city: row.city || 'Desconhecida',
        networkBox: row.networkBox || 'Sem caixa/rede',
        total: row.total,
      })),
      filters: {
        cities: citiesRaw.map((row) => row.cityArea).filter(Boolean),
        technicians: techniciansRaw.map((row) => row.technician).filter(Boolean),
        statuses: statusesRaw.map((row) => row.status).filter(Boolean),
        occurrenceTypes: INFRA_OCCURRENCE_OPTIONS,
      },
    });
  } catch (error) {
    console.error('[infrastructure-dashboard]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
