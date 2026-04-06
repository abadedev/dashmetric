import { NextRequest, NextResponse } from 'next/server';
import { and, asc, count, eq, sql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'resumo-sla.view', {
    moduleSlug: 'resumo-sla',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const filters: SQL[] = [eq(atendimentos.workspaceId, result.context.workspaceId)];
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
      if (fromStr) filters.push(sql`${dataRef} >= ${new Date(fromStr)}`);
      if (toStr) filters.push(sql`${dataRef} <= ${new Date(toStr)}`);
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const summaryRaw = await db
      .select({
        periodYear: atendimentos.periodYear,
        periodMonth: atendimentos.periodMonth,
        activityType: atendimentos.tipo,
        slaTargetHours: atendimentos.slaHoras,
        total: count(),
        concluded: sql<number>`cast(sum(case when ${atendimentos.finalizacaoAt} is not null then 1 else 0 end) as int)`,
        withinSlaCorrido: sql<number>`cast(sum(case when ${atendimentos.dentroSla} = true then 1 else 0 end) as int)`,
        withinSlaUtil: sql<number>`cast(sum(case when ${atendimentos.dentroSlaUtil} = true then 1 else 0 end) as int)`,
      })
      .from(atendimentos)
      .where(whereClause)
      .groupBy(
        atendimentos.periodYear,
        atendimentos.periodMonth,
        atendimentos.tipo,
        atendimentos.slaHoras
      )
      .orderBy(asc(atendimentos.periodYear), asc(atendimentos.periodMonth));

    const data = summaryRaw.map((summary) => ({
      periodYear: summary.periodYear,
      periodMonth: summary.periodMonth,
      activityType: summary.activityType,
      slaTargetHours: summary.slaTargetHours != null ? Number(summary.slaTargetHours) : null,
      total: summary.total,
      concluded: summary.concluded,
      withinSlaCorrido: summary.withinSlaCorrido,
      withinSlaUtil: summary.withinSlaUtil,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[sla-summary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
