import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { and, eq, ilike, desc, count, or, sql, SQL } from 'drizzle-orm';
import { parseDateFrom, parseDateTo } from '@/lib/utils/date-filters';
import { calculateValidAverage } from '@/lib/utils/average';
import { qualityRecords } from '@/lib/db/schema';
import { SLA_TARGETS } from '@/lib/services/sla-engine';

const RETIRADA_META_SECONDS = (SLA_TARGETS.retirada_kit ?? 72) * 3600;

export const runtime = 'nodejs';

const SLUG_TO_TIPO: Record<string, string> = {
  instalacao_nova: 'Instalação (Nova)',
  instalacao_reativacao: 'Instalação (Reativação)',
  reparo: 'Reparo',
  mudanca_endereco: 'Mudança de Endereço',
  retirada_kit: 'Retirada de Kit',
  mudanca_plano: 'Mudança de Plano',
  retorno: 'Retorno',
  atendimento_interno: 'Atendimento Interno',
  cancelado_reparo: 'Cancelado – Reparo',
  cancelado_retirada_kit: 'Cancelado – Retirada de Kit',
  cancelado_mudanca_endereco: 'Cancelado – Mudança de Endereço',
  cancelado_retorno: 'Cancelado – Retorno',
  cancelado_reativacao_login: 'Cancelado – Reativação de Login',
};

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, Number(searchParams.get('page')     || 1));
    const pageSize     = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const fromStr      = searchParams.get('from');
    const toStr        = searchParams.get('to');
    const type         = searchParams.get('type');
    const technicianId = searchParams.get('technicianId');
    const city         = searchParams.get('city');
    const plan         = searchParams.get('plan');
    const bairro       = searchParams.get('bairro');
    const source       = searchParams.get('source');
    const slaStatus    = searchParams.get('slaStatus'); // 'ok' | 'nok' | 'all'
    const search       = searchParams.get('search');

    const filters: SQL[] = [eq(atendimentos.workspaceId, ctx.workspaceId)];

    // Filtro de data: prioriza finalizacaoAt; fallback para aberturaAt e createdAt
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
      const parts: SQL[] = [];
      if (fromStr) parts.push(sql`${dataRef} >= ${parseDateFrom(fromStr)}`);
      if (toStr)   parts.push(sql`${dataRef} <= ${parseDateTo(toStr)}`);
      if (parts.length === 2) filters.push(sql`(${parts[0]} AND ${parts[1]})`);
      else if (parts.length === 1) filters.push(parts[0]);
    }

    if (type)         filters.push(eq(atendimentos.tipo, SLUG_TO_TIPO[type] ?? type));
    if (technicianId) filters.push(eq(atendimentos.tecnicoId, Number(technicianId)));
    if (city)         filters.push(ilike(atendimentos.cidade, `%${city}%`));
    if (plan)         filters.push(ilike(atendimentos.plano, `%${plan}%`));
    if (bairro)       filters.push(ilike(atendimentos.bairro, `%${bairro}%`));
    if (source)       filters.push(ilike(atendimentos.indicacao, `%${source}%`));
    if (slaStatus === 'ok')  filters.push(eq(atendimentos.dentroSla, true));
    if (slaStatus === 'nok') filters.push(eq(atendimentos.dentroSla, false));
    if (search) {
      filters.push(or(
        ilike(atendimentos.numeroOs, `%${search}%`),
        ilike(atendimentos.cliente, `%${search}%`),
        ilike(atendimentos.endereco, `%${search}%`),
        ilike(atendimentos.bairro, `%${search}%`),
        ilike(atendimentos.plano, `%${search}%`),
        ilike(atendimentos.telefones, `%${search}%`)
      )!);
    }

    const whereClause = filters.length ? and(...filters) : undefined;
    const offset = (page - 1) * pageSize;

    // Filtros apenas de período (workspace + from/to), sem type/slaStatus/search,
    // para os indicadores de INR Reparos que valem sempre sobre o período completo.
    const periodoFilters: SQL[] = [eq(atendimentos.workspaceId, ctx.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.finalizacaoAt}, ${atendimentos.aberturaAt}, ${atendimentos.createdAt})`;
      if (fromStr) periodoFilters.push(sql`${dataRef} >= ${parseDateFrom(fromStr)}`);
      if (toStr)   periodoFilters.push(sql`${dataRef} <= ${parseDateTo(toStr)}`);
    }
    const reparoWhere = and(...periodoFilters, ilike(atendimentos.tipo, '%reparo%'));

    const qualityFilters: SQL[] = [eq(qualityRecords.workspaceId, ctx.workspaceId)];
    const qDateRef = sql`COALESCE(${qualityRecords.openedAt}, ${qualityRecords.createdAt})`;
    if (fromStr) qualityFilters.push(sql`${qDateRef} >= ${parseDateFrom(fromStr)}`);
    if (toStr)   qualityFilters.push(sql`${qDateRef} <= ${parseDateTo(toStr)}`);
    const qualityWhere = and(...qualityFilters);

    const [rows, [totalRow], [slaRow], slaByTypeRaw, [reparoRow], qualityByIndicatorRaw] = await Promise.all([
      db
        .select({
          id:                atendimentos.id,
          numeroOs:          atendimentos.numeroOs,
          tipo:              atendimentos.tipo,
          motivo:            atendimentos.motivo,
          solucao:           atendimentos.solucao,
          cliente:           atendimentos.cliente,
          cidade:            atendimentos.cidade,
          plano:             atendimentos.plano,
          endereco:          atendimentos.endereco,
          aberturaAt:        atendimentos.aberturaAt,
          finalizacaoAt:     atendimentos.finalizacaoAt,
          slaHoras:          atendimentos.slaHoras,
          slaCorridoSegundos:atendimentos.slaCorridoSegundos,
          slaUtilSegundos:   atendimentos.slaUtilSegundos,
          dentroSla:         atendimentos.dentroSla,
          dentroSlaUtil:     atendimentos.dentroSlaUtil,
          periodMonth:       atendimentos.periodMonth,
          periodYear:        atendimentos.periodYear,
          tecnico:           atendimentos.tecnico,
          tecnicoId:         atendimentos.tecnicoId,
          login:             atendimentos.login,
          bairro:            atendimentos.bairro,
          atendente:         atendimentos.atendente,
          mac:               atendimentos.mac,
          empresa:           atendimentos.empresa,
          observacao:        atendimentos.observacao,
          telefones:         atendimentos.telefones,
        })
        .from(atendimentos)
        .where(whereClause)
        .orderBy(desc(atendimentos.aberturaAt))
        .limit(pageSize)
        .offset(offset),

      db.select({ total: count() }).from(atendimentos).where(whereClause),

      db.select({
        withinSlaCorrido: sql<number>`count(*) filter (where ${atendimentos.dentroSla} = true)`.as('within_sla_corrido'),
        outsideSlaCorrido: sql<number>`count(*) filter (where ${atendimentos.dentroSla} = false and ${atendimentos.finalizacaoAt} is not null)`.as('outside_sla_corrido'),
        withinSlaUtil: sql<number>`count(*) filter (where ${atendimentos.dentroSlaUtil} = true)`.as('within_sla_util'),
        outsideSlaUtil: sql<number>`count(*) filter (where ${atendimentos.dentroSlaUtil} = false and ${atendimentos.finalizacaoAt} is not null)`.as('outside_sla_util'),
      }).from(atendimentos).where(whereClause),

      db
        .select({
          tipo:             atendimentos.tipo,
          slaHoras:         atendimentos.slaHoras,
          total:            count(),
          concluded:        sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
          withinSlaCorrido: sql<number>`cast(sum(case
            when ${atendimentos.dentroSla} = true then 1
            when ${atendimentos.tipo} ilike '%retirada%' and ${atendimentos.finalizacaoAt} is not null and ${atendimentos.slaCorridoSegundos} is not null and ${atendimentos.slaCorridoSegundos} <= ${RETIRADA_META_SECONDS} then 1
            else 0 end) as int)`,
          withinSlaUtil:    sql<number>`cast(sum(case
            when ${atendimentos.dentroSlaUtil} = true then 1
            when ${atendimentos.tipo} ilike '%retirada%' and ${atendimentos.finalizacaoAt} is not null and ${atendimentos.slaUtilSegundos} is not null and ${atendimentos.slaUtilSegundos} <= ${RETIRADA_META_SECONDS} then 1
            else 0 end) as int)`,
        })
        .from(atendimentos)
        .where(whereClause)
        .groupBy(atendimentos.tipo, atendimentos.slaHoras),

      db.select({ total: count() }).from(atendimentos).where(reparoWhere),

      db
        .select({ indicator: qualityRecords.indicator, total: count() })
        .from(qualityRecords)
        .where(qualityWhere)
        .groupBy(qualityRecords.indicator),
    ]);

    const slaByType = slaByTypeRaw.map((t) => {
      const concluded        = Number(t.concluded);
      const withinSlaCorrido = Number(t.withinSlaCorrido);
      const withinSlaUtil    = Number(t.withinSlaUtil);
      return {
        activityType:      t.tipo,
        slaTargetHours:    t.slaHoras != null ? Number(t.slaHoras) : null,
        total:             t.total,
        concluded,
        withinSlaCorrido,
        slaCorridoPercent: concluded > 0 ? withinSlaCorrido / concluded : 0,
        withinSlaUtil,
        slaUtilPercent:    concluded > 0 ? withinSlaUtil / concluded : 0,
      };
    });

    const tiposParaMetaGeral = slaByType.filter(
      (t) => t.activityType !== 'retirada_kit' && t.activityType !== 'Retirada de Kit'
    );
    const slaCorridoGeral = calculateValidAverage(tiposParaMetaGeral.map((t) => t.slaCorridoPercent));
    const slaUtilGeral = calculateValidAverage(tiposParaMetaGeral.map((t) => t.slaUtilPercent));

    const byIndicator = {
      IQIv: qualityByIndicatorRaw.find((q) => q.indicator === 'IQIv')?.total ?? 0,
      IQRv: qualityByIndicatorRaw.find((q) => q.indicator === 'IQRv')?.total ?? 0,
    };
    const totalReparos = reparoRow?.total ?? 0;
    const inrReparos =
      totalReparos > 0
        ? Math.round(((byIndicator.IQIv + byIndicator.IQRv) / totalReparos) * 100 * 100) / 100
        : null;

    const total = totalRow?.total ?? 0;
    const withinSlaCorrido = Number(slaRow?.withinSlaCorrido ?? 0);
    const outsideSlaCorrido = Number(slaRow?.outsideSlaCorrido ?? 0);
    const withinSlaUtil = Number(slaRow?.withinSlaUtil ?? 0);
    const outsideSlaUtil = Number(slaRow?.outsideSlaUtil ?? 0);
    const slaPercent = total > 0 ? Math.round((withinSlaCorrido / total) * 10000) / 10000 : 0;
    const slaUtilPercent = total > 0 ? Math.round((withinSlaUtil / total) * 10000) / 10000 : 0;

    const data = rows.map((r) => ({
      id:               String(r.id),
      osNumber:         r.numeroOs,
      activityType:     r.tipo,
      reason:           r.motivo,
      solution:         r.solucao,
      clientName:       r.cliente,
      city:             r.cidade,
      plan:             r.plano,
      address:          r.endereco,
      openedAt:         r.aberturaAt,
      closedAt:         r.finalizacaoAt,
      slaTargetHours:   r.slaHoras != null ? Number(r.slaHoras) : null,
      slaCorridoSeconds:r.slaCorridoSegundos,
      slaUtilSeconds:   r.slaUtilSegundos,
      withinSlaCorrido: r.dentroSla,
      withinSlaUtil:    r.dentroSlaUtil,
      periodMonth:      r.periodMonth,
      periodYear:       r.periodYear,
      technicianName:   r.tecnico,
      login:            r.login,
      bairro:           r.bairro,
      atendente:        r.atendente,
      mac:              r.mac,
      empresa:          r.empresa,
      observacao:       r.observacao,
      telefones:        r.telefones,
    }));

    return NextResponse.json({
      data,
      total,
      withinSla: withinSlaCorrido,
      outsideSla: outsideSlaCorrido,
      slaPercent,
      withinSlaCorrido,
      outsideSlaCorrido,
      withinSlaUtil,
      outsideSlaUtil,
      slaUtilPercent,
      slaByType,
      slaCorridoGeral,
      slaUtilGeral,
      totalReparos,
      byIndicator,
      inrReparos,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filtersApplied: {
        from: fromStr,
        to: toStr,
        type,
        technicianId,
        city,
        plan,
        bairro,
        source,
        slaStatus,
        search,
      },
    });
  } catch (err) {
    console.error('[service-orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
