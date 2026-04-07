import { NextRequest, NextResponse } from 'next/server';
import { detectFileType } from '@/lib/importacao/detect-file-type';
import { detectarTipoPlanilha } from '@/lib/importacao/detectar-tipo-planilha';
import { parseCsv } from '@/lib/importacao/parse-csv';
import { parseXlsx } from '@/lib/importacao/parse-xlsx';
import {
  getModuleRegistryEntry,
  isSystemModuleKey,
} from '@/lib/modules/module-registry';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  return runWithWorkspace(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const tipoPlanilhaManual = formData.get('tipoPlanilha') as string | null;
      const reimportarQualidade = formData.get('reimportarQualidade') === 'true';

      if (!file) {
        return NextResponse.json({ error: 'Arquivo nao enviado.' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        return NextResponse.json(
          { error: 'Formato nao suportado. Envie um arquivo .csv ou .xlsx.' },
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

      const linhasBrutas: Record<string, string>[] =
        tipoArquivo === 'xlsx'
          ? parseXlsx(buffer)
          : parseCsv(buffer.toString('utf-8'));

      if (!linhasBrutas.length) {
        return NextResponse.json({ error: 'Arquivo vazio ou sem linhas validas.' }, { status: 400 });
      }

      const headers = Object.keys(linhasBrutas[0]);
      const tipoPlanilha = isSystemModuleKey(tipoPlanilhaManual)
        ? tipoPlanilhaManual
        : detectarTipoPlanilha(headers, file.name);

      const moduleEntry = getModuleRegistryEntry(tipoPlanilha);
      const result = await moduleEntry.importHandler({
        workspaceId: ctx.workspaceId,
        fileName: file.name,
        buffer,
        rows: linhasBrutas,
        reimportarQualidade,
      });

      return NextResponse.json(result);
    } catch (err) {
      console.error('[importar]', err);

      const message = err instanceof Error ? err.message : String(err);
      const dbError = err as Error & {
        code?: string;
        detail?: string;
        constraint?: string;
        column?: string;
        table?: string;
      };

      const debug =
        dbError.code || dbError.detail || dbError.constraint || dbError.column || dbError.table
          ? {
              code: dbError.code,
              detail: dbError.detail,
              constraint: dbError.constraint,
              column: dbError.column,
              table: dbError.table,
            }
          : undefined;

      if (err instanceof Error && err.message.includes('reimportacao segura')) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      return NextResponse.json(
        { success: false, error: message || 'Internal server error', debug },
        { status: 500 }
      );
    }
  });
}
