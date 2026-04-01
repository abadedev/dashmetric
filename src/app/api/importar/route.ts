import { NextRequest, NextResponse } from 'next/server';
import { importarAtendimentos } from '@/lib/importacao/importar-atendimentos';
import {
  importarQualidade,
  inferirPeriodosQualidade,
  limparQualidadePorPeriodos,
} from '@/lib/importacao/importar-qualidade';
import { importarSuporte } from '@/lib/importacao/importar-suporte';
import { importarVendas } from '@/lib/importacao/importar-vendas';
import { importarCancelamentos } from '@/lib/importacao/importar-cancelamentos';
import { importarInfraestrutura } from '@/lib/importacao/importar-infraestrutura';
import { detectarTipoPlanilha } from '@/lib/importacao/detectar-tipo-planilha';
import { detectFileType } from '@/lib/importacao/detect-file-type';
import { parseCsv } from '@/lib/importacao/parse-csv';
import { parseXlsx } from '@/lib/importacao/parse-xlsx';
import { requireAuth } from '@/lib/require-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipoPlanilhaManual = formData.get('tipoPlanilha') as string | null;
    const reimportarQualidade = formData.get('reimportarQualidade') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie um arquivo .csv ou .xlsx.' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Limite: 50 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tipoArquivo = detectFileType(file.name, buffer);

    // Parse bruto para detectar tipo de planilha pelos headers
    const linhasBrutas: Record<string, string>[] =
      tipoArquivo === 'xlsx'
        ? parseXlsx(buffer)
        : parseCsv(buffer.toString('utf-8'));

    if (!linhasBrutas.length) {
      return NextResponse.json({ error: 'Arquivo vazio ou sem linhas válidas.' }, { status: 400 });
    }

    const headers = Object.keys(linhasBrutas[0]);
    const tipoPlanilha =
      tipoPlanilhaManual && ['atendimentos', 'qualidade', 'suporte', 'vendas', 'cancelamentos', 'infraestrutura'].includes(tipoPlanilhaManual)
        ? tipoPlanilhaManual
        : detectarTipoPlanilha(headers);

    // ── Roteamento ────────────────────────────────────────────────────────────

    if (tipoPlanilha === 'qualidade') {
      let reimportacao: { periodos: string[]; registrosRemovidos: number } | undefined;
      let resumo;
      if (reimportarQualidade) {
        const periodos = inferirPeriodosQualidade(linhasBrutas);

        if (periodos.length === 0) {
          return NextResponse.json(
            { error: 'Nao foi possivel inferir os periodos da planilha de qualidade para reimportacao segura.' },
            { status: 400 }
          );
        }

        const transactional = await db.transaction(async (tx) => {
          const txExecutor = tx as unknown as typeof db;
          const registrosRemovidos = await limparQualidadePorPeriodos(periodos, txExecutor);
          const resumoTx = await importarQualidade(linhasBrutas, txExecutor);

          return { registrosRemovidos, resumoTx };
        });

        reimportacao = {
          periodos: periodos.map((p) => `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`),
          registrosRemovidos: transactional.registrosRemovidos,
        };
        resumo = transactional.resumoTx;
      } else {
        resumo = await importarQualidade(linhasBrutas);
      }

      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Qualidade concluída',
        resumo,
        reimportacao,
      });
    }

    if (tipoPlanilha === 'suporte') {
      const now = new Date();
      const resumo = await importarSuporte(
        linhasBrutas,
        now.getMonth() + 1,
        now.getFullYear()
      );
      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Suporte Técnico concluída',
        resumo,
      });
    }

    if (tipoPlanilha === 'vendas') {
      const resumo = await importarVendas(linhasBrutas, file.name);
      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Vendas concluída',
        resumo,
      });
    }

    if (tipoPlanilha === 'cancelamentos') {
      const resumo = await importarCancelamentos(linhasBrutas);
      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Cancelamentos concluída',
        resumo,
      });
    }

    if (tipoPlanilha === 'infraestrutura') {
      const resumo = await importarInfraestrutura(linhasBrutas);
      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Infraestrutura concluída',
        resumo,
      });
    }

    // Atendimentos (fluxo original — inclui parse, deduplicação, SLA etc.)
    const { loteId, resumo } = await importarAtendimentos(buffer, file.name);
    return NextResponse.json({
      success: true,
      tipoPlanilha,
      message: 'Importação de Atendimentos concluída',
      loteId,
      resumo,
    });

  } catch (err) {
    console.error('[importar/atendimentos]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
