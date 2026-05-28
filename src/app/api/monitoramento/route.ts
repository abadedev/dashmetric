import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, getTableColumns, gte, ilike, lte, ne, or, sql } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { monitoramentoItems } from '@/lib/db/infra-schema';
import { getModuleAccessLevel } from '@/lib/authorization';
import { ensureMonitoramentoTable } from '@/lib/monitoramento/ensure-monitoramento-table';
import {
  ACTIVE_STATUSES,
  CONCLUDED_STATUS,
  monitoramentoPayloadSchema,
  normalizeMultilineText,
  normalizeNullableText,
} from '@/lib/monitoramento/constants';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'monitoramento.view', {
    moduleSlug: 'monitoramento',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    await ensureMonitoramentoTable();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const areaCity = searchParams.get('areaCity');
    const problema = searchParams.get('problema');
    const sensor = searchParams.get('sensor');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const tab = searchParams.get('tab');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(9999, Math.max(1, parseInt(searchParams.get('pageSize') ?? '100', 10)));
    const offset = (page - 1) * pageSize;

    const db = getInfraDb();
    const baseFilters = [eq(monitoramentoItems.workspaceId, result.context.workspaceId)];

    if (from) baseFilters.push(gte(monitoramentoItems.dataPostagem, from));
    if (to) baseFilters.push(lte(monitoramentoItems.dataPostagem, to));
    if (areaCity && areaCity !== 'all') baseFilters.push(ilike(monitoramentoItems.areaCity, `%${areaCity}%`));
    if (problema && problema !== 'all') baseFilters.push(eq(monitoramentoItems.problema, problema));
    if (sensor && sensor !== 'all') baseFilters.push(eq(monitoramentoItems.sensor, sensor));
    if (search) {
      baseFilters.push(
        or(
          ilike(monitoramentoItems.cliente, `%${search}%`),
          ilike(monitoramentoItems.rede, `%${search}%`),
          ilike(monitoramentoItems.login, `%${search}%`)
        )!
      );
    }

    const statusFilters = [];
    if (tab === 'ativos') {
      statusFilters.push(ne(monitoramentoItems.status, CONCLUDED_STATUS));
    } else if (tab === 'concluidos') {
      statusFilters.push(eq(monitoramentoItems.status, CONCLUDED_STATUS));
    }
    if (status && status !== 'all') statusFilters.push(eq(monitoramentoItems.status, status));

    const baseCondition = and(...baseFilters);
    const condition = and(...baseFilters, ...statusFilters);
    const activeStatusOr = or(...ACTIVE_STATUSES.map((item) => eq(monitoramentoItems.status, item)))!;
    const concludedStatus = eq(monitoramentoItems.status, CONCLUDED_STATUS);

    const [countResult, countAtivos, countConcluidos, rows, areasRaw] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(monitoramentoItems).where(condition),
      db.select({ count: sql<number>`count(*)::int` }).from(monitoramentoItems).where(and(baseCondition, activeStatusOr)),
      db.select({ count: sql<number>`count(*)::int` }).from(monitoramentoItems).where(and(baseCondition, concludedStatus)),
      db
        .select({ ...getTableColumns(monitoramentoItems) })
        .from(monitoramentoItems)
        .where(condition)
        .orderBy(desc(monitoramentoItems.dataPostagem), asc(monitoramentoItems.id))
        .limit(pageSize)
        .offset(offset),
      db
        .selectDistinct({ areaCity: monitoramentoItems.areaCity })
        .from(monitoramentoItems)
        .where(eq(monitoramentoItems.workspaceId, result.context.workspaceId))
        .orderBy(asc(monitoramentoItems.areaCity)),
    ]);

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: rows,
      total,
      totalAtivos: countAtivos[0]?.count ?? 0,
      totalConcluidos: countConcluidos[0]?.count ?? 0,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
      areas: areasRaw.map((row) => row.areaCity).filter(Boolean),
      moduleAccessLevel: getModuleAccessLevel(result.context, 'monitoramento', 'user'),
    });
  } catch (error) {
    console.error('[monitoramento GET]', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'monitoramento.create', {
    moduleSlug: 'monitoramento',
    action: 'create',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    await ensureMonitoramentoTable();

    const body = await req.json();
    const parsed = monitoramentoPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload inválido.' }, { status: 400 });
    }

    const db = getInfraDb();
    const userEmail = result.context.session.user.email ?? result.context.session.user.name ?? 'unknown';
    const payload = parsed.data;
    const status = payload.status ?? '0_aguardando_rede';

    const [created] = await db
      .insert(monitoramentoItems)
      .values({
        workspaceId: result.context.workspaceId,
        dataPostagem: payload.dataPostagem,
        areaCity: normalizeNullableText(payload.areaCity),
        cliente: normalizeNullableText(payload.cliente),
        login: normalizeNullableText(payload.login),
        rede: normalizeNullableText(payload.rede),
        serialMac: normalizeNullableText(payload.serialMac),
        problema: payload.problema ?? null,
        qtdDesconexao: payload.qtdDesconexao ?? null,
        observacoes: normalizeMultilineText(payload.observacoes),
        solucao: normalizeMultilineText(payload.solucao),
        dataSolucao: normalizeNullableText(payload.dataSolucao),
        atendAberto: payload.atendAberto ?? false,
        sensor: payload.sensor ?? null,
        status,
        criadoPor: userEmail,
        resolvidoPor: status === CONCLUDED_STATUS ? userEmail : null,
        resolvidoAt: status === CONCLUDED_STATUS ? new Date() : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[monitoramento POST]', error);
    return NextResponse.json({ error: 'Erro ao criar registro.' }, { status: 500 });
  }
}
