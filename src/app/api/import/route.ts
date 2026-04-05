import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lotesImportacao } from '@/lib/db/schema';
import { importarAtendimentos } from '@/lib/importacao/importar-atendimentos';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (max 50MB)' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json(
        { error: 'Use o fluxo unificado de importacao com arquivos CSV/XLSX' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { loteId, resumo } = await importarAtendimentos(buffer, file.name, ctx.workspaceId);

    return NextResponse.json({
      success: true,
      tipoPlanilha: 'atendimentos',
      message: 'Endpoint legado encaminhado para o fluxo unificado de atendimentos.',
      loteId,
      resumo,
      deprecated: true,
    });
  } catch (err) {
    console.error('[import legacy]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async (ctx) => {
    const batches = await db
      .select()
      .from(lotesImportacao)
      .where(eq(lotesImportacao.workspaceId, ctx.workspaceId))
      .orderBy(lotesImportacao.createdAt);
    return NextResponse.json(batches);
  });
}
