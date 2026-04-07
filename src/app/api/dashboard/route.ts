import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, qualityRecords } from '@/lib/db/schema';
import { calculateValidAverage } from '@/lib/utils/average';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { and, count, eq, gte, ilike, lte, sql, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'dashboard.view', {
    moduleSlug: 'dashboard',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');

    // Filtro de data para atendimentos: COALESCE(aberturaAt, finalizacaoAt, createdAt)
    const atendFilters: SQL[] = [eq(atendimentos.workspaceId, result.context.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
      if (fromStr) atendFilters.push(sql`${dataRef} >= ${new Date(fromStr)}`);
      if (toStr)   atendFilters.push(sql`${dataRef} <= ${new Date(toStr)}`);
    }
    const atendWhere = atendFilters.length ? and(...atendFilters) : undefined;

    // Filtro de data para qualidade (usa openedAt)
    const qualityFilters: SQL[] = [eq(qualityRecords.workspaceId, result.context.workspaceId)];
    if (fromStr) qualityFilters.push(gte(qualityRecords.openedAt, new Date(fromStr)));
    if (toStr)   qualityFilters.push(lte(qualityRecords.openedAt, new Date(toStr)));
    const qualityWhere = qualityFilters.length ? and(...qualityFilters) : undefined;

    // Filtro de reparos para RTV
    const reparoFilters: SQL[] = [
      eq(atendimentos.workspaceId, result.context.workspaceId),
      ilike(atendimentos.tipo, 'reparo'),
    ];
    if (fromStr) reparoFilters.push(gte(atendimentos.aberturaAt, new Date(fromStr)));
    if (toStr)   reparoFilters.push(lte(atendimentos.aberturaAt, new Date(toStr)));
    const reparoWhere = and(...reparoFilters);

    const [
      [totalRow],
      slaByTypeRaw,
      qualityIndicatorsRaw,
      [reparoRow],
    ] = await Promise.all([
      db.select({ total: count() }).from(atendimentos).where(atendWhere),

      db
        .select({
          tipo:             atendimentos.tipo,
          slaHoras:         atendimentos.slaHoras,
          total:            count(),
          concluded:        sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
          withinSlaCorrido: sql<number>`cast(sum(case when ${atendimentos.dentroSla} = true then 1 else 0 end) as int)`,
          withinSlaUtil:    sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
          avgCorridoSeconds:sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaCorridoSegundos} else null end)`,
          avgUtilSeconds:   sql<number>`avg(case when ${atendimentos.finalizacaoAt} is not null then ${atendimentos.slaUtilSegundos} else null end)`,
        })
        .from(atendimentos)
        .where(atendWhere)
        .groupBy(atendimentos.tipo, atendimentos.slaHoras),

      db
        .select({
          indicator: qualityRecords.indicator,
          total:     count(),
        })
        .from(qualityRecords)
        .where(qualityWhere)
        .groupBy(qualityRecords.indicator),

      db.select({ total: count() }).from(atendimentos).where(reparoWhere),
    ]);

    const slaByType = slaByTypeRaw.map((t) => {
      const concluded        = Number(t.concluded);
      const withinSlaUtil    = Number(t.withinSlaUtil);
      const withinSlaCorrido = Number(t.withinSlaCorrido);
      return {
        activityType:      t.tipo,
        slaTargetHours:    t.slaHoras != null ? Number(t.slaHoras) : null,
        total:             t.total,
        concluded,
        withinSlaCorrido,
        withinSlaUtil,
        avgCorridoSeconds: Number(t.avgCorridoSeconds) || null,
        avgUtilSeconds:    Number(t.avgUtilSeconds) || null,
        slaUtilPercent:    concluded > 0 ? withinSlaUtil / concluded : 0,
        slaCorridoPercent: concluded > 0 ? withinSlaCorrido / concluded : 0,
      };
    });

    const byIndicator: Record<string, number> = {};
    for (const q of qualityIndicatorsRaw) {
      byIndicator[q.indicator] = q.total;
    }

    const totalReparos = reparoRow?.total ?? 0;

    const qualityIndicators = [
      { indicator: 'IQIv', total: byIndicator['IQIv'] ?? 0 },
      { indicator: 'IQRv', total: byIndicator['IQRv'] ?? 0 },
      { indicator: 'RTV',  total: totalReparos },
      { indicator: 'RST',  total: (byIndicator['IQIv'] ?? 0) + (byIndicator['IQRv'] ?? 0) },
      { indicator: 'ICT',  total: byIndicator['ICT'] ?? 0 },
    ].filter((q) => q.total > 0);

    return NextResponse.json({
      totalAtendimentos: totalRow?.total ?? 0,
      slaUtilGeral:    calculateValidAverage(slaByType.map((t) => t.slaUtilPercent)),
      slaCorridoGeral: calculateValidAverage(slaByType.map((t) => t.slaCorridoPercent)),
      metaSLA: 0.95,
      slaByType,
      qualityIndicators,
    });
  } catch (err) {
    console.error('[dashboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
