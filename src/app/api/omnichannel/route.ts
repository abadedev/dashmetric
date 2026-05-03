import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { omnichannelRecords } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { AGENTES_EXCLUIDOS } from '@/lib/omnichannel/constants';
import { and, asc, eq } from 'drizzle-orm';

function normalizeAgente(agente: string): string {
  return agente.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

function isHumanRecord(agente: string, isHuman: boolean): boolean {
  if (!isHuman) return false;
  // Safety net: rejeita pelo nome mesmo que is_human tenha sido persistido errado
  return !agente.split('/').map(normalizeAgente).some((seg) => AGENTES_EXCLUIDOS.has(seg));
}

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'omnichannel.view', {
    moduleSlug: 'omnichannel',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : null;
    const grupoParam = searchParams.get('grupo');
    const grupo = grupoParam && ['geral', 'admin', 'suporte', 'vendas'].includes(grupoParam)
      ? grupoParam
      : null;

    const conditions = [eq(omnichannelRecords.workspaceId, result.context.workspaceId)];
    if (month) conditions.push(eq(omnichannelRecords.periodMonth, month));
    if (year)  conditions.push(eq(omnichannelRecords.periodYear, year));
    if (grupo) conditions.push(eq(omnichannelRecords.grupo, grupo));

    const records = await db
      .select()
      .from(omnichannelRecords)
      .where(and(...conditions))
      .orderBy(asc(omnichannelRecords.agente));

    // Separate humans from bots — isHumanRecord aplica is_human + safety net por nome
    const human = records.filter((r) => isHumanRecord(r.agente, r.isHuman));
    const bots  = records.filter((r) => !isHumanRecord(r.agente, r.isHuman));

    function toSeconds(t: string | null): number {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
      if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      return 0;
    }

    // Bots entram apenas neste total — em todo o resto são excluídos
    const totalAtendimentos = records.reduce((a, r) => a + (r.quantidade ?? 0), 0);
    const humanWithTma = human.filter((r) => r.tma && toSeconds(r.tma) > 0);
    const humanWithTme = human.filter((r) => r.tme && toSeconds(r.tme) > 0);

    const sortedByTma = [...humanWithTma].sort((a, b) => toSeconds(a.tma) - toSeconds(b.tma));
    const sortedByTme = [...humanWithTme].sort((a, b) => toSeconds(a.tme) - toSeconds(b.tme));

    // Available periods for filter dropdowns
    const allPeriods = await db
      .selectDistinct({ month: omnichannelRecords.periodMonth, year: omnichannelRecords.periodYear })
      .from(omnichannelRecords)
      .where(eq(omnichannelRecords.workspaceId, result.context.workspaceId))
      .orderBy(asc(omnichannelRecords.periodYear), asc(omnichannelRecords.periodMonth));

    const allGrupos = await db
      .selectDistinct({ grupo: omnichannelRecords.grupo })
      .from(omnichannelRecords)
      .where(eq(omnichannelRecords.workspaceId, result.context.workspaceId))
      .orderBy(asc(omnichannelRecords.grupo));

    const nomesUnicos = new Set(human.map((r) => r.agente.trim().toLowerCase()));

    return NextResponse.json({
      records: human,
      bots,
      totalAtendentes: nomesUnicos.size,
      totalAtendimentos,
      melhorTma: sortedByTma[0] ?? null,
      piorTma:   sortedByTma[sortedByTma.length - 1] ?? null,
      melhorTme: sortedByTme[0] ?? null,
      piorTme:   sortedByTme[sortedByTme.length - 1] ?? null,
      periods: allPeriods,
      grupos: allGrupos.map((g) => g.grupo),
    });
  } catch (err) {
    console.error('[omnichannel] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
