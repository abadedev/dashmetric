import { NextRequest, NextResponse } from 'next/server';
import { and, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportCallRecords } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getSupportTypeSummary } from '@/lib/services/support-summary-service';
import { classifySupportRecord, SUPPORT_CATEGORIES } from '@/lib/importacao/classify-support';
import { getClientesAtivos } from '@/lib/utils/clientes-ativos';

function computeInr(baseAtiva: number, totalSupporte: number) {
  const inr = totalSupporte > 0 ? Math.round((baseAtiva / totalSupporte) * 100) / 100 : 0;
  return { inr, baseAtiva, totalSupporte };
}

export const runtime = 'nodejs';

type Segmento = 'Técnico' | 'Comercial' | 'Financeiro' | 'Outros';

interface LinhaResposta {
  segmento: Segmento;
  problemaReclamado: string;
  causa: string;
  quantidade: number;
  percentualDoTotal: number;
}

const FINANCEIRO_CATEGORIES = new Set<string>([
  SUPPORT_CATEGORIES.BLOQUEIO_SUSPENSAO,
  SUPPORT_CATEGORIES.BOLETO_FINANCEIRO,
]);

const COMERCIAL_CATEGORIES = new Set<string>([
  SUPPORT_CATEGORIES.DSTECH_PLAY,
  SUPPORT_CATEGORIES.CANCELAMENTO,
  SUPPORT_CATEGORIES.MUDANCA_PLANO,
  SUPPORT_CATEGORIES.MUDANCA_TITULARIDADE,
  SUPPORT_CATEGORIES.MUDANCA_ENDERECO,
  SUPPORT_CATEGORIES.REATIVACAO,
]);

const OUTROS_CATEGORIES = new Set<string>([
  SUPPORT_CATEGORIES.CONTATO_SEM_PROBLEMA,
  SUPPORT_CATEGORIES.OUTROS,
]);

const SEGMENTO_ORDER: Record<Segmento, number> = {
  Comercial: 1,
  Financeiro: 2,
  Técnico: 3,
  Outros: 4,
};

function resolveSegmento(categoria: string): Segmento {
  if (FINANCEIRO_CATEGORIES.has(categoria)) return 'Financeiro';
  if (COMERCIAL_CATEGORIES.has(categoria)) return 'Comercial';
  if (OUTROS_CATEGORIES.has(categoria)) return 'Outros';
  return 'Técnico';
}

function parseDateFrom(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function parseDateTo(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function periodKey(date: Date) {
  return date.getUTCFullYear() * 100 + date.getUTCMonth() + 1;
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'suporte.view', {
    moduleSlug: 'suporte',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const url = new URL(req.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const mesParam = url.searchParams.get('mes');
    const anoParam = url.searchParams.get('ano');
    const segmentoFiltro = url.searchParams.get('segmento') as Segmento | null;

    const now = new Date();
    const mes = mesParam ? parseInt(mesParam, 10) : now.getMonth() + 1;
    const ano = anoParam ? parseInt(anoParam, 10) : now.getFullYear();
    const from = parseDateFrom(fromParam) ?? new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
    const to = parseDateTo(toParam) ?? new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }

    const whereDetalhado: SQL[] = [
      sql`${supportCallRecords.periodYear} * 100 + ${supportCallRecords.periodMonth} >= ${periodKey(from)}`,
      sql`${supportCallRecords.periodYear} * 100 + ${supportCallRecords.periodMonth} <= ${periodKey(to)}`,
    ];

    const detalhados = await db
      .select({
        problemaReclamado: supportCallRecords.problemaReclamado,
        causa: supportCallRecords.causa,
        segmento: supportCallRecords.segmento,
      })
      .from(supportCallRecords)
      .where(and(...whereDetalhado));

    if (detalhados.length > 0) {
      // Totais por segmento: usa o campo `segmento` já gravado na importação
      // (calcularSegmento), em vez de reclassificar via classifySupportRecord.
      const totalPorSegmento: Record<Segmento, number> = {
        Técnico: 0,
        Comercial: 0,
        Financeiro: 0,
        Outros: 0,
      };
      for (const row of detalhados) {
        const seg: Segmento =
          row.segmento === 'Técnico' || row.segmento === 'Comercial' ||
          row.segmento === 'Financeiro' || row.segmento === 'Outros'
            ? row.segmento
            : 'Outros';
        totalPorSegmento[seg] += 1;
      }
      const totalGeral =
        totalPorSegmento.Técnico + totalPorSegmento.Comercial +
        totalPorSegmento.Financeiro + totalPorSegmento.Outros;

      // Linhas detalhadas: continuam usando classifySupportRecord para o
      // breakdown por categoria (problemaReclamado), mas o `segmento` da linha
      // vem do campo gravado.
      const counts = new Map<string, { quantidade: number; segmento: Segmento }>();
      for (const row of detalhados) {
        const seg: Segmento =
          row.segmento === 'Técnico' || row.segmento === 'Comercial' ||
          row.segmento === 'Financeiro' || row.segmento === 'Outros'
            ? row.segmento
            : 'Outros';
        if (segmentoFiltro && seg !== segmentoFiltro) continue;
        const categoria = classifySupportRecord(
          [row.problemaReclamado, row.causa].filter(Boolean).join(' ')
        );
        const entry = counts.get(categoria) ?? { quantidade: 0, segmento: seg };
        entry.quantidade += 1;
        counts.set(categoria, entry);
      }

      const linhas: LinhaResposta[] = Array.from(counts.entries())
        .map(([categoria, { quantidade, segmento }]) => ({
          segmento,
          problemaReclamado: categoria,
          causa: 'Classificação automática',
          quantidade,
          percentualDoTotal:
            totalGeral > 0 ? Number(((quantidade / totalGeral) * 100).toFixed(2)) : 0,
        }))
        .sort((left, right) => {
          const segmentoOrder = SEGMENTO_ORDER[left.segmento] - SEGMENTO_ORDER[right.segmento];
          return (
            segmentoOrder ||
            right.quantidade - left.quantidade ||
            left.problemaReclamado.localeCompare(right.problemaReclamado)
          );
        });

      const baseAtiva = await getClientesAtivos();

      return NextResponse.json({
        fonte: 'detalhado' as const,
        linhas,
        totais: {
          geral: totalGeral,
          tecnico: totalPorSegmento.Técnico,
          comercial: totalPorSegmento.Comercial,
          financeiro: totalPorSegmento.Financeiro,
          outros: totalPorSegmento.Outros,
          percentualComercial:
            totalGeral > 0
              ? Number(((totalPorSegmento.Comercial / totalGeral) * 100).toFixed(2))
              : 0,
          percentualFinanceiro:
            totalGeral > 0
              ? Number(((totalPorSegmento.Financeiro / totalGeral) * 100).toFixed(2))
              : 0,
        },
        ...computeInr(baseAtiva, totalGeral),
      });
    }

    const legado = await getSupportTypeSummary({
      from,
      to,
      workspaceId: result.context.workspaceId,
    });

    const baseAtiva = await getClientesAtivos();

    return NextResponse.json({
      fonte: 'legado' as const,
      dadosLegado: {
        summary: legado.summary,
        total: legado.total,
        triageByAttendant: legado.triageByAttendant,
      },
      ...computeInr(baseAtiva, legado.total),
    });
  } catch (err) {
    console.error('[suporte/call-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
