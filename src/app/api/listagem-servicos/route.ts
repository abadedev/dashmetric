import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import {
  INFRA_OCCURRENCE_OPTIONS,
  normalizeCityArea,
  normalizeNullableText,
  serviceListingPayloadSchema,
} from '@/lib/listagem-servicos/infra-occurrences';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';
import { getModuleAccessLevel } from '@/lib/authorization';

export const runtime = 'nodejs';

const RESOLVED_STATUSES = ['resolvido'];
const OPEN_STATUSES = ['pendente', 'em_andamento', 'tecnico_direcionado', 'em_monitoramento', 'nao_resolvido'];
const openAgeLabelExpr = sql<string>`case
  when greatest(0, current_date - ${serviceListings.referenceDate}) = 0 then 'Hoje'
  else greatest(0, current_date - ${serviceListings.referenceDate})::text || 'd'
end`;

function sortOpenAgeOptions(values: string[]) {
  const uniqueValues = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return uniqueValues.sort((left, right) => {
    if (left === 'Hoje') return -1;
    if (right === 'Hoje') return 1;
    return Number.parseInt(left.replace('d', ''), 10) - Number.parseInt(right.replace('d', ''), 10);
  });
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'listagem-servicos.view', {
    moduleSlug: 'listagem-servicos',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    await ensureServiceListingsTable();

    const { searchParams } = new URL(req.url);
    const exportMode = searchParams.get('export') === '1';
    if (exportMode) {
      const exportPermission = await requireWorkspacePermission(req, 'listagem-servicos.export', {
        moduleSlug: 'listagem-servicos',
        action: 'export',
        requiredRole: 'user',
      });
      if (exportPermission.response) return exportPermission.response;
    }

    const statusFilter = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const city = searchParams.get('city');
    const technician = searchParams.get('technician');
    const technology = searchParams.get('technology');
    const tipoOcorrencia = searchParams.get('tipoOcorrencia');
    const occurrenceCreated = searchParams.get('occurrenceCreated');
    const openAge = searchParams.get('openAge');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(9999, Math.max(1, parseInt(searchParams.get('pageSize') ?? '100', 10)));
    const offset = (page - 1) * pageSize;
    const sortParam = searchParams.get('sort');
    const dirParam = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

    const ALLOWED_SORT_FIELDS = {
      priority: serviceListings.priority,
      referenceDate: serviceListings.referenceDate,
      cityArea: serviceListings.cityArea,
      networkBox: serviceListings.networkBox,
      status: serviceListings.status,
      technician: serviceListings.technician,
      openAge: sql<number>`greatest(0, current_date - ${serviceListings.referenceDate})`,
      resolvedAt: serviceListings.resolvedAt,
    } as const;

    const sortColumn =
      sortParam && sortParam in ALLOWED_SORT_FIELDS
        ? ALLOWED_SORT_FIELDS[sortParam as keyof typeof ALLOWED_SORT_FIELDS]
        : serviceListings.referenceDate;

    const orderClause = dirParam === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const db = getInfraDb();

    // Base filters (date, city, technician, technology, occurrence, search) — no status
    const baseFilters = [];
    if (from) baseFilters.push(gte(serviceListings.referenceDate, from));
    if (to) baseFilters.push(lte(serviceListings.referenceDate, to));
    if (city && city !== 'all') baseFilters.push(ilike(serviceListings.cityArea, `%${city}%`));
    if (technician && technician !== 'all') baseFilters.push(ilike(serviceListings.technician, `%${technician}%`));
    if (technology && technology !== 'all') baseFilters.push(eq(serviceListings.technology, technology));
    if (tipoOcorrencia && tipoOcorrencia !== 'all') baseFilters.push(eq(serviceListings.tipoOcorrencia, tipoOcorrencia));
    if (occurrenceCreated === 'true') baseFilters.push(eq(serviceListings.occurrenceCreated, true));
    if (occurrenceCreated === 'false') {
      baseFilters.push(
        or(eq(serviceListings.occurrenceCreated, false), sql`${serviceListings.occurrenceCreated} IS NULL`)!
      );
    }
    if (search) {
      baseFilters.push(
        or(
          ilike(serviceListings.address, `%${search}%`),
          ilike(serviceListings.networkBox, `%${search}%`)
        )!
      );
    }
    const baseFiltersWithoutOpenAge = [...baseFilters];
    if (openAge && openAge !== 'all') baseFilters.push(sql`${openAgeLabelExpr} = ${openAge}`);

    // Status filter — applied on top of base filters for the main query
    const statusFilters = [];
    if (statusFilter === 'pendentes') {
      statusFilters.push(or(...OPEN_STATUSES.map((s) => eq(serviceListings.status, s)))!);
    } else if (statusFilter === 'resolvidos') {
      statusFilters.push(or(...RESOLVED_STATUSES.map((s) => eq(serviceListings.status, s)))!);
    } else if (statusFilter && statusFilter !== 'all') {
      statusFilters.push(eq(serviceListings.status, statusFilter));
    }

    const allFilters = [...baseFilters, ...statusFilters];
    const condition = allFilters.length ? and(...allFilters) : undefined;
    const baseCondition = baseFilters.length ? and(...baseFilters) : undefined;
    const baseConditionWithoutOpenAge = baseFiltersWithoutOpenAge.length ? and(...baseFiltersWithoutOpenAge) : undefined;

    const pendingStatusOr = or(...OPEN_STATUSES.map((s) => eq(serviceListings.status, s)))!;
    const resolvedStatusOr = or(...RESOLVED_STATUSES.map((s) => eq(serviceListings.status, s)))!;

    const [countResult, countPendentes, countResolvidos, rows, citiesRaw, techniciansRaw, openAgeRaw] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(serviceListings).where(condition),
      db.select({ count: sql<number>`count(*)::int` }).from(serviceListings).where(
        baseCondition ? and(baseCondition, pendingStatusOr) : pendingStatusOr
      ),
      db.select({ count: sql<number>`count(*)::int` }).from(serviceListings).where(
        baseCondition ? and(baseCondition, resolvedStatusOr) : resolvedStatusOr
      ),
      db
        .select()
        .from(serviceListings)
        .where(condition)
        .orderBy(orderClause, asc(serviceListings.id))
        .limit(pageSize)
        .offset(offset),
      db
        .selectDistinct({ cityArea: serviceListings.cityArea })
        .from(serviceListings)
        .where(undefined)
        .orderBy(asc(serviceListings.cityArea)),
      db
        .selectDistinct({ technician: serviceListings.technician })
        .from(serviceListings)
        .where(sql`${serviceListings.technician} IS NOT NULL AND ${serviceListings.technician} != ''`)
        .orderBy(asc(serviceListings.technician)),
      db
        .selectDistinct({ openAge: openAgeLabelExpr })
        .from(serviceListings)
        .where(baseConditionWithoutOpenAge ? and(baseConditionWithoutOpenAge, pendingStatusOr) : pendingStatusOr), // openAge só para registros em aberto
    ]);

    const total = countResult[0]?.count ?? 0;
    const openAgeOptions = sortOpenAgeOptions(openAgeRaw.map((row) => row.openAge).filter(Boolean));

    return NextResponse.json({
      data: rows,
      total,
      totalPendentes: countPendentes[0]?.count ?? 0,
      totalResolvidos: countResolvidos[0]?.count ?? 0,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
      cities: (() => {
        const seen = new Set<string>();
        return citiesRaw
          .map((row) => normalizeCityArea(row.cityArea))
          .filter(Boolean)
          .map((c) => c!.toUpperCase())
          .filter((c) => !seen.has(c) && seen.add(c))
          .sort();
      })(),
      technicians: techniciansRaw.map((row) => row.technician).filter(Boolean),
      occurrenceTypes: INFRA_OCCURRENCE_OPTIONS,
      openAgeOptions,
      moduleAccessLevel: getModuleAccessLevel(result.context, 'listagem-servicos', 'user'),
    });
  } catch (error) {
    console.error('[listagem-servicos GET]', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'listagem-servicos.create', {
    moduleSlug: 'listagem-servicos',
    action: 'create',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    await ensureServiceListingsTable();

    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const body = await req.json();
    const parsed = serviceListingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload invalido.' }, { status: 400 });
    }

    const db = getInfraDb();
    const userEmail = result.context.session.user.email ?? result.context.session.user.name ?? 'unknown';
    const payload = parsed.data;

    if (!force && payload.networkBox && payload.cityArea) {
      const caExistente = await db
        .select({ id: serviceListings.id, status: serviceListings.status, referenceDate: serviceListings.referenceDate })
        .from(serviceListings)
        .where(
          and(
            eq(serviceListings.networkBox, payload.networkBox),
            ilike(serviceListings.cityArea, payload.cityArea),
            or(
              eq(serviceListings.status, 'pendente'),
              eq(serviceListings.status, 'em_andamento'),
              eq(serviceListings.status, 'tecnico_direcionado')
            )
          )
        )
        .limit(1);

      if (caExistente.length > 0) {
        return NextResponse.json({
          error: `Já existe uma OS pendente para ${payload.networkBox} em ${payload.cityArea} (aberta em ${caExistente[0]?.referenceDate}).`,
          conflict: true,
          existingId: caExistente[0]?.id,
        }, { status: 409 });
      }
    }

    const [created] = await db
      .insert(serviceListings)
      .values({
        referenceDate: payload.referenceDate,
        priority: normalizeNullableText(payload.priority),
        technology: normalizeNullableText(payload.technology),
        cityArea: normalizeCityArea(payload.cityArea),
        address: normalizeNullableText(payload.address),
        locationUrl: normalizeNullableText(payload.locationUrl),
        networkBox: normalizeNullableText(payload.networkBox),
        problem: normalizeNullableText(payload.problem),
        tipoOcorrencia: payload.tipoOcorrencia,
        observacaoInfra: normalizeNullableText(payload.observacaoInfra),
        status: payload.status ?? 'pendente',
        occurrenceCreated: payload.occurrenceCreated ?? false,
        solicitante: normalizeNullableText(payload.solicitante),
        createdBy: userEmail,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[listagem-servicos POST]', error);
    return NextResponse.json({ error: 'Erro ao criar registro.' }, { status: 500 });
  }
}
