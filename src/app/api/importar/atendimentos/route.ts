import { NextRequest, NextResponse } from 'next/server';
import { importarAtendimentos } from '@/lib/importacao/importar-atendimentos';
import { importarQualidade } from '@/lib/importacao/importar-qualidade';
import { importarSuporte } from '@/lib/importacao/importar-suporte';
import { detectarTipoPlanilha } from '@/lib/importacao/detectar-tipo-planilha';
import { detectFileType } from '@/lib/importacao/detect-file-type';
import { parseCsv } from '@/lib/importacao/parse-csv';
import { parseXlsx } from '@/lib/importacao/parse-xlsx';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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
    const tipoPlanilha = detectarTipoPlanilha(headers);

    // ── Roteamento ────────────────────────────────────────────────────────────

    if (tipoPlanilha === 'qualidade') {
      const resumo = await importarQualidade(linhasBrutas);
      return NextResponse.json({
        success: true,
        tipoPlanilha,
        message: 'Importação de Qualidade concluída',
        resumo,
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
      {
        success: false,
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
