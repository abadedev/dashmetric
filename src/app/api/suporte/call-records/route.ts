import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportCallRecords } from '@/lib/db/schema';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getSupportTypeSummary } from '@/lib/services/support-summary-service';

export const runtime = 'nodejs';

type Segmento = 'Técnico' | 'Comercial' | 'Financeiro' | 'Outros';

interface LinhaResposta {
  segmento: Segmento;
  problemaReclamado: string;
  causa: string;
  quantidade: number;
  percentualDoTotal: number;
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
    const mesParam = url.searchParams.get('mes');
    const anoParam = url.searchParams.get('ano');
    const segmentoFiltro = url.searchParams.get('segmento');

    const now = new Date();
    const mes = mesParam ? parseInt(mesParam, 10) : now.getMonth() + 1;
    const ano = anoParam ? parseInt(anoParam, 10) : now.getFullYear();

    if (!Number.isFinite(mes) || mes < 1 || mes > 12 || !Number.isFinite(ano)) {
      return NextResponse.json({ error: 'mes/ano inválidos' }, { status: 400 });
    }

    // 1) Tenta a fonte detalhada (1 linha por OS).
    const whereDetalhado = [
      eq(supportCallRecords.periodMonth, mes),
      eq(supportCallRecords.periodYear, ano),
    ];
    if (segmentoFiltro) {
      whereDetalhado.push(eq(supportCallRecords.segmento, segmentoFiltro));
    }

    const rows = await db
      .select({
        segmento: supportCallRecords.segmento,
        problemaReclamado: supportCallRecords.problemaReclamado,
        causa: supportCallRecords.causa,
        quantidade: count(),
      })
      .from(supportCallRecords)
      .where(and(...whereDetalhado))
      .groupBy(
        supportCallRecords.segmento,
        supportCallRecords.problemaReclamado,
        supportCallRecords.causa,
      )
      .orderBy(
        sql`CASE ${supportCallRecords.segmento}
          WHEN 'Comercial' THEN 1
          WHEN 'Financeiro' THEN 2
          WHEN 'Técnico' THEN 3
          ELSE 4 END`,
        desc(count()),
      );

    if (rows.length > 0) {
      const totalGeral = rows.reduce((acc, r) => acc + Number(r.quantidade ?? 0), 0);
      const totalPorSegmento: Record<Segmento, number> = {
        'Técnico': 0,
        'Comercial': 0,
        'Financeiro': 0,
        'Outros': 0,
      };
      const linhas: LinhaResposta[] = rows.map((r) => {
        const seg = (r.segmento ?? 'Outros') as Segmento;
        const qtd = Number(r.quantidade ?? 0);
        totalPorSegmento[seg] = (totalPorSegmento[seg] ?? 0) + qtd;
        return {
          segmento: seg,
          problemaReclamado: r.problemaReclamado ?? '(não informado)',
          causa: r.causa ?? '(não informado)',
          quantidade: qtd,
          percentualDoTotal:
            totalGeral > 0 ? Number(((qtd / totalGeral) * 100).toFixed(2)) : 0,
        };
      });

      return NextResponse.json({
        fonte: 'detalhado' as const,
        linhas,
        totais: {
          geral: totalGeral,
          tecnico: totalPorSegmento['Técnico'],
          comercial: totalPorSegmento['Comercial'],
          financeiro: totalPorSegmento['Financeiro'],
          outros: totalPorSegmento['Outros'],
          percentualComercial:
            totalGeral > 0
              ? Number(((totalPorSegmento['Comercial'] / totalGeral) * 100).toFixed(2))
              : 0,
          percentualFinanceiro:
            totalGeral > 0
              ? Number(((totalPorSegmento['Financeiro'] / totalGeral) * 100).toFixed(2))
              : 0,
        },
      });
    }

    // 2) Fallback: nada na fonte detalhada — devolve agregação legada.
    const from = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const legado = await getSupportTypeSummary({
      from,
      to,
      workspaceId: result.context.workspaceId,
    });

    return NextResponse.json({
      fonte: 'legado' as const,
      dadosLegado: {
        summary: legado.summary,
        total: legado.total,
        triageByAttendant: legado.triageByAttendant,
      },
    });
  } catch (err) {
    console.error('[suporte/call-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
