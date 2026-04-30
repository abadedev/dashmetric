import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, qualityRecords } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { and, count, desc, eq, gte, ilike, lte, or, SQL } from 'drizzle-orm';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'qualidade.view', {
    moduleSlug: 'qualidade',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const body = await req.json();
    const { indicator, technicianName, clientName, city, plan, reason, osNumber, openedAt: openedAtStr } = body;

    if (!indicator || !['IQIv', 'IQRv', 'ICT'].includes(indicator)) {
      return NextResponse.json({ error: 'Indicador inválido. Use IQIv, IQRv ou ICT.' }, { status: 400 });
    }
    if (!technicianName?.trim()) {
      return NextResponse.json({ error: 'Nome do técnico é obrigatório.' }, { status: 400 });
    }

    const openedAt = openedAtStr ? new Date(openedAtStr) : new Date();
    const periodMonth = openedAt.getMonth() + 1;
    const periodYear = openedAt.getFullYear();

    const [record] = await db.insert(qualityRecords).values({
      workspaceId: result.context.workspaceId,
      indicator: indicator as never,
      technicianName: technicianName.trim(),
      clientName: clientName?.trim() || null,
      city: city?.trim() || null,
      plan: plan?.trim() || null,
      reason: reason?.trim() || null,
      osNumber: osNumber?.trim() || null,
      openedAt,
      periodMonth,
      periodYear,
    }).returning();

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('[quality-records POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'qualidade.view', {
    moduleSlug: 'qualidade',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr   = searchParams.get('from');
    const toStr     = searchParams.get('to');
    const indicator = searchParams.get('indicator');
    const city      = searchParams.get('city');
    const plan      = searchParams.get('plan');
    const search    = searchParams.get('search');
    const technicianId = searchParams.get('technicianId');

    // Filters WITHOUT indicator (for aggregate totals per indicator)
    const baseFilters: SQL[] = [eq(qualityRecords.workspaceId, result.context.workspaceId)];
    if (fromStr) baseFilters.push(gte(qualityRecords.openedAt, parseDateFrom(fromStr)));
    if (toStr)   baseFilters.push(lte(qualityRecords.openedAt, parseDateTo(toStr)));
    if (city) baseFilters.push(ilike(qualityRecords.city, `%${city}%`));
    if (plan) baseFilters.push(ilike(qualityRecords.plan, `%${plan}%`));
    if (technicianId) baseFilters.push(eq(qualityRecords.technicianId, Number(technicianId)));
    if (search) {
      baseFilters.push(or(
        ilike(qualityRecords.osNumber, `%${search}%`),
        ilike(qualityRecords.clientName, `%${search}%`),
        ilike(qualityRecords.technicianName, `%${search}%`),
        ilike(qualityRecords.reason, `%${search}%`),
        ilike(qualityRecords.solution, `%${search}%`),
        ilike(qualityRecords.plan, `%${search}%`)
      )!);
    }

    // Filters WITH indicator (for paginated records)
    const filters: SQL[] = [...baseFilters];
    if (indicator) filters.push(eq(qualityRecords.indicator, indicator as never));

    const baseWhereClause = baseFilters.length ? and(...baseFilters) : undefined;
    const whereClause = filters.length ? and(...filters) : undefined;

    // Aggregate totals per indicator (always without indicator filter)
    const indicatorTotals = await db
      .select({ indicator: qualityRecords.indicator, total: count() })
      .from(qualityRecords)
      .where(baseWhereClause)
      .groupBy(qualityRecords.indicator);

    const byIndicator: Record<string, number> = {};
    for (const row of indicatorTotals) {
      byIndicator[row.indicator] = row.total;
    }

    // Total de reparos no período (para cálculo do RTV)
    // O TIPO_MAP grava 'Reparo' (com maiúscula) no banco
    const reparoFilters: SQL[] = [
      eq(atendimentos.workspaceId, result.context.workspaceId),
      ilike(atendimentos.tipo, 'reparo'),
    ];
    if (fromStr) reparoFilters.push(gte(atendimentos.aberturaAt, parseDateFrom(fromStr)));
    if (toStr)   reparoFilters.push(lte(atendimentos.aberturaAt, parseDateTo(toStr)));

    const [reparoCount] = await db
      .select({ total: count() })
      .from(atendimentos)
      .where(and(...reparoFilters));

    const rows = await db
      .select({
        id:             qualityRecords.id,
        osNumber:       qualityRecords.osNumber,
        indicator:      qualityRecords.indicator,
        reason:         qualityRecords.reason,
        solution:       qualityRecords.solution,
        clientName:     qualityRecords.clientName,
        city:           qualityRecords.city,
        plan:           qualityRecords.plan,
        openedAt:       qualityRecords.openedAt,
        closedAt:       qualityRecords.closedAt,
        durationSeconds:qualityRecords.durationSeconds,
        periodMonth:    qualityRecords.periodMonth,
        periodYear:     qualityRecords.periodYear,
        technicianName: qualityRecords.technicianName,
      })
      .from(qualityRecords)
      .where(whereClause)
      .orderBy(desc(qualityRecords.createdAt))
      .limit(200);

    const data = rows.map((r) => ({
      id:             String(r.id),
      osNumber:       r.osNumber,
      indicator:      r.indicator,
      reason:         r.reason,
      solution:       r.solution,
      clientName:     r.clientName,
      city:           r.city,
      plan:           r.plan,
      openedAt:       r.openedAt,
      closedAt:       r.closedAt,
      durationSeconds:r.durationSeconds,
      periodMonth:    r.periodMonth,
      periodYear:     r.periodYear,
      technicianName: r.technicianName,
    }));

    return NextResponse.json({
      data,
      byIndicator,
      totalReparos: reparoCount?.total ?? 0,
      filtersApplied: {
        from: fromStr,
        to: toStr,
        indicator,
        city,
        plan,
        technicianId,
        search,
      },
    });
  } catch (err) {
    console.error('[quality-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
