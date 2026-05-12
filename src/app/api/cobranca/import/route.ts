import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cobrancaImports, cobrancaRegistros } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { parseCobrancaXlsx, type TipoLista } from '@/lib/cobranca/parser';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH_SIZE = 100;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('arquivo') as File | null;
    const tipoListaRaw = formData.get('tipoLista');

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    const tipoLista = String(tipoListaRaw ?? '') as TipoLista;
    if (tipoLista !== 'boletos_vencidos' && tipoLista !== 'pre_inativacao') {
      return NextResponse.json({ error: 'tipoLista inválido.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: 'Formato inválido. Envie .xlsx.' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (>50MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { registros } = parseCobrancaXlsx(buffer, tipoLista);

    if (!registros.length) {
      return NextResponse.json({ error: 'Nenhum registro válido encontrado.' }, { status: 400 });
    }

    const [importRow] = await db
      .insert(cobrancaImports)
      .values({
        tipoLista,
        nomeArquivo: file.name,
        totalRegistros: registros.length,
        inseridos: 0,
        atualizados: 0,
        ignorados: 0,
      })
      .returning({ id: cobrancaImports.id });

    const importId = importRow.id;
    let inseridos = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
      const lote = registros.slice(i, i + BATCH_SIZE);

      try {
        const valuesSql = sql.join(
          lote.map(
            (r) => sql`(
              ${r.clienteNome},
              ${r.clienteCodigo ?? null},
              ${r.telefone ?? null},
              ${r.cidade ?? null},
              ${r.vencimento ?? null},
              ${r.valor ?? null},
              ${r.statusSistema ?? null},
              ${r.motivoAtraso ?? null},
              ${r.perfilAtraso ?? null},
              ${r.tempoDeCasa ?? null},
              ${r.dataPagamento ?? null},
              ${r.dataBloqueio ?? null},
              ${r.statusCrm},
              ${r.observacao ?? null},
              ${r.meioContato ?? null},
              ${r.tipoLista},
              ${importId},
              ${r.linhaCor ?? null}
            )`
          ),
          sql`, `
        );

        const result = await db.execute(sql`
          insert into cobranca_registros (
            cliente_nome, cliente_codigo, telefone, cidade,
            vencimento, valor, status_sistema, motivo_atraso,
            perfil_atraso, tempo_de_casa, data_pagamento, data_bloqueio,
            status_crm, observacao, meio_contato, tipo_lista,
            import_id, linha_cor
          )
          values ${valuesSql}
          on conflict (coalesce(cliente_codigo, cliente_nome), vencimento, tipo_lista)
          do update set
            cliente_nome    = excluded.cliente_nome,
            telefone        = excluded.telefone,
            cidade          = excluded.cidade,
            valor           = excluded.valor,
            status_sistema  = excluded.status_sistema,
            motivo_atraso   = excluded.motivo_atraso,
            perfil_atraso   = excluded.perfil_atraso,
            tempo_de_casa   = excluded.tempo_de_casa,
            data_pagamento  = excluded.data_pagamento,
            data_bloqueio   = excluded.data_bloqueio,
            status_crm      = excluded.status_crm,
            observacao      = excluded.observacao,
            meio_contato    = excluded.meio_contato,
            import_id       = excluded.import_id,
            linha_cor       = excluded.linha_cor,
            updated_at      = now()
          returning id, created_at, updated_at
        `);

        const rows = result.rows as Array<{ id: number; created_at: Date; updated_at: Date }>;
        for (const row of rows) {
          const c = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
          const u = row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at);
          if (Math.abs(c.getTime() - u.getTime()) < 2000) inseridos++;
          else atualizados++;
        }
        ignorados += lote.length - rows.length;
      } catch (batchErr) {
        console.error('[cobranca/import] batch error', batchErr);
        ignorados += lote.length;
      }
    }

    await db
      .update(cobrancaImports)
      .set({ inseridos, atualizados, ignorados })
      .where(sql`${cobrancaImports.id} = ${importId}`);

    return NextResponse.json({
      importId,
      totalRegistros: registros.length,
      inseridos,
      atualizados,
      ignorados,
    });
  } catch (err) {
    console.error('[cobranca/import]', err);
    const message = err instanceof Error ? err.message : 'Erro ao processar arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
