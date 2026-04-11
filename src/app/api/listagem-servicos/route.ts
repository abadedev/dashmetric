import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import type { AppRole } from '@/lib/services/module-service';
import {
  INFRA_OCCURRENCE_OPTIONS,
  normalizeNullableText,
  serviceListingPayloadSchema,
} from '@/lib/listagem-servicos/infra-occurrences';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';

export const runtime = 'nodejs';

const RESOLVED_STATUSES = ['resolvido', 'nao_resolvido'];

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  try {
    await ensureServiceListingsTable();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const city = searchParams.get('city');
    const technician = searchParams.get('technician');
    const technology = searchParams.get('technology');
    const tipoOcorrencia = searchParams.get('tipoOcorrencia');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));
    const offset = (page - 1) * pageSize;

    const db = getInfraDb();
    const filters = [];

    if (statusFilter === 'pendentes') {
      filters.push(or(...['pendente', 'em_andamento', 'tecnico_direcionado'].map((status) => eq(serviceListings.status, status)))!);
    } else if (statusFilter === 'resolvidos') {
      filters.push(or(...RESOLVED_STATUSES.map((status) => eq(serviceListings.status, status)))!);
    } else if (statusFilter && statusFilter !== 'all') {
      filters.push(eq(serviceListings.status, statusFilter));
    }

    if (from) filters.push(gte(serviceListings.referenceDate, from));
    if (to) filters.push(lte(serviceListings.referenceDate, to));
    if (city && city !== 'all') filters.push(ilike(serviceListings.cityArea, `%${city}%`));
    if (technician && technician !== 'all') filters.push(ilike(serviceListings.technician, `%${technician}%`));
    if (technology && technology !== 'all') filters.push(eq(serviceListings.technology, technology));
    if (tipoOcorrencia && tipoOcorrencia !== 'all') filters.push(eq(serviceListings.tipoOcorrencia, tipoOcorrencia));

    const condition = filters.length ? and(...filters) : undefined;

    const [countResult, rows, citiesRaw, techniciansRaw] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(serviceListings).where(condition),
      db
        .select()
        .from(serviceListings)
        .where(condition)
        .orderBy(desc(serviceListings.referenceDate), asc(serviceListings.id))
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
    ]);

    return NextResponse.json({
      data: rows,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
      cities: citiesRaw.map((row) => row.cityArea).filter(Boolean),
      technicians: techniciansRaw.map((row) => row.technician).filter(Boolean),
      occurrenceTypes: INFRA_OCCURRENCE_OPTIONS,
    });
  } catch (error) {
    console.error('[listagem-servicos GET]', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  const userRole = ((result.session.user as { role?: AppRole }).role ?? 'user') as AppRole;
  if (userRole === 'user') {
    return NextResponse.json({ error: 'Sem permiss\u00E3o para criar registros.' }, { status: 403 });
  }

  try {
    await ensureServiceListingsTable();

    const body = await req.json();
    const parsed = serviceListingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload invalido.' }, { status: 400 });
    }

    const db = getInfraDb();
    const userEmail = result.session.user.email ?? result.session.user.name ?? 'unknown';
    const payload = parsed.data;

    const [created] = await db
      .insert(serviceListings)
      .values({
        referenceDate: payload.referenceDate,
        priority: normalizeNullableText(payload.priority),
        technology: normalizeNullableText(payload.technology),
        cityArea: normalizeNullableText(payload.cityArea),
        address: normalizeNullableText(payload.address),
        locationUrl: normalizeNullableText(payload.locationUrl),
        networkBox: normalizeNullableText(payload.networkBox),
        problem: normalizeNullableText(payload.problem),
        tipoOcorrencia: payload.tipoOcorrencia,
        observacaoInfra: normalizeNullableText(payload.observacaoInfra),
        status: payload.status ?? 'pendente',
        occurrenceCreated: payload.occurrenceCreated ?? false,
        createdBy: userEmail,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[listagem-servicos POST]', error);
    return NextResponse.json({ error: 'Erro ao criar registro.' }, { status: 500 });
  }
}
