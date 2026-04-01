import { db } from '@/lib/db';
import { lotesImportacao, importacoesBrutas, technicians, holidays } from '@/lib/db/schema';
import { getAtendimentosCollection } from '@/lib/db/mongo';
import { eq } from 'drizzle-orm';

import { detectFileType } from './detect-file-type';
import { parseCsv } from './parse-csv';
import { parseXlsx } from './parse-xlsx';
import { normalizarLinha } from './normalizar-linha';
import { mapearAtendimento } from './mapear-atendimento';
import { normalizeTechName } from './helpers';
import { linhaNormalizadaSchema } from '../validators/import-atendimento.schema';
import type { ResumoImportacao } from '../validators/import-atendimento.schema';
import { normalizeHolidayKeys } from '@/lib/sla/calculate-sla';

const SHOULD_STORE_RAW_IMPORT_ROWS =
  process.env.STORE_RAW_IMPORT_ROWS === 'true' ||
  process.env.STORE_RAW_IMPORT_ROWS === '1';

// ── Resolução de técnicos ─────────────────────────────────────────────────────

async function resolverTecnicos(
  nomes: Set<string>,
  loginMap: Map<string, string>
): Promise<Map<string, number>> {
  const cache = new Map<string, number>();

  for (const nome of nomes) {
    if (!nome) continue;

    const existing = await db.query.technicians.findFirst({
      where: (t, { or, eq: eqFn }) => or(eqFn(t.name, nome), eqFn(t.login, nome)),
    });

    if (existing) {
      // Preenche login se ainda não tiver
      const loginCode = loginMap.get(nome) ?? null;
      if (!existing.login && loginCode) {
        await db
          .update(technicians)
          .set({ login: loginCode, updatedAt: new Date() })
          .where(eq(technicians.id, existing.id));
      }
      cache.set(nome, existing.id);
    } else {
      const [created] = await db
        .insert(technicians)
        .values({ name: nome, login: loginMap.get(nome) ?? null })
        .returning();
      cache.set(nome, created.id);
    }
  }

  return cache;
}

async function carregarFeriados(): Promise<Set<string>> {
  const rows = await db.select({ date: holidays.date }).from(holidays);
  return normalizeHolidayKeys(rows.map((row) => row.date as Date | string));
}

// ── Serviço principal ─────────────────────────────────────────────────────────

export async function importarAtendimentos(
  buffer: Buffer,
  filename: string
): Promise<{ loteId: number; resumo: ResumoImportacao }> {

  const tipoArquivo = detectFileType(filename, buffer);

  // 1. Parse bruto
  const linhasBrutas: Record<string, string>[] =
    tipoArquivo === 'xlsx'
      ? parseXlsx(buffer)
      : parseCsv(buffer.toString('utf-8'));

  // 2. Cria o lote de importação
  const [lote] = await db
    .insert(lotesImportacao)
    .values({ arquivo: filename, tipoArquivo, status: 'processando' })
    .returning();

  const resumo: ResumoImportacao = {
    totalLidas:     linhasBrutas.length,
    totalValidas:   0,
    totalInvalidas: 0,
    totalInseridas: 0,
    totalDuplicadas:0,
    erros:    [],
    warnings: [],
  };

  try {
    // 3. Salva linhas brutas para auditoria apenas quando explicitamente habilitado.
    if (SHOULD_STORE_RAW_IMPORT_ROWS && linhasBrutas.length) {
      const CHUNK_BRUTO = 200;
      for (let i = 0; i < linhasBrutas.length; i += CHUNK_BRUTO) {
        await db.insert(importacoesBrutas).values(
          linhasBrutas.slice(i, i + CHUNK_BRUTO).map((raw) => ({
            loteImportacaoId: lote.id,
            rawJson: raw,
          }))
        );
      }
    }

    // 4. Normaliza e valida cada linha
    // Libera o array bruto da memória antes de alocar os arrays de validação
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linhasValidas: Array<{ idx: number; normalizada: Record<string, string> }> = [];

    for (let i = 0; i < linhasBrutas.length; i++) {
      const linhaBruta = linhasBrutas[i];
      const numLinha = i + 2; // +2 porque linha 1 é o header

      try {
        const normalizada = normalizarLinha(linhaBruta);
        const parsed = linhaNormalizadaSchema.safeParse(normalizada);

        if (!parsed.success) {
          const msgs = parsed.error.issues.map((e) => e.message).join('; ');
          resumo.erros.push({ linha: numLinha, erro: msgs });
          resumo.totalInvalidas++;
          continue;
        }

        linhasValidas.push({ idx: numLinha, normalizada });
        resumo.totalValidas++;
      } catch (err: unknown) {
        resumo.erros.push({ linha: numLinha, erro: String(err) });
        resumo.totalInvalidas++;
      }
    }
    (linhasBrutas as any[]).length = 0;

    // 5. Resolve técnicos em lote
    const nomesTecnicos = new Set<string>();
    const loginMap = new Map<string, string>();

    for (const { normalizada } of linhasValidas) {
      const nome = normalizeTechName(normalizada.tecnico ?? '');
      const login = (normalizada.login ?? '').trim();
      if (nome) {
        nomesTecnicos.add(nome);
        if (login) loginMap.set(nome, login);
      }
    }

    const tecnicoCache = await resolverTecnicos(nomesTecnicos, loginMap);

    const feriados = await carregarFeriados();

    // 6. Mapeia para entidade final
    const registrosMapeados: Array<{
      idx: number;
      dados: Record<string, unknown>;
    }> = [];

    for (const { idx, normalizada } of linhasValidas) {
      try {
        const nomeNorm = normalizeTechName(normalizada.tecnico ?? '');
        const tecnicoId = tecnicoCache.get(nomeNorm) ?? null;

        const { dados, warning } = mapearAtendimento(
          normalizada as any,
          lote.id,
          tecnicoId,
          feriados
        );

        if (warning) resumo.warnings.push({ linha: idx, aviso: warning });

        registrosMapeados.push({ idx, dados });
      } catch (err: unknown) {
        resumo.erros.push({ linha: idx, erro: String(err) });
        resumo.totalInvalidas++;
        resumo.totalValidas--;
      }
    }

    // 7. Sem deduplicação: toda linha válida do arquivo deve ser inserida.
    const paraInserir = registrosMapeados;

    // 8. Insere no MongoDB em lotes de 500
    const col = await getAtendimentosCollection();
    const now = new Date();
    const CHUNK_INSERT = 500;
    for (let i = 0; i < paraInserir.length; i += CHUNK_INSERT) {
      const chunk = paraInserir.slice(i, i + CHUNK_INSERT);
      try {
        const docs = chunk.map((r) => ({
          ...r.dados,
          slaHoras: r.dados.slaHoras != null ? Number(r.dados.slaHoras) : null,
          createdAt: now,
          updatedAt: now,
        }));
        await col.insertMany(docs as any, { ordered: false });
        resumo.totalInseridas += chunk.length;
      } catch (error: any) {
        // insertMany com ordered:false — conta inseridos e registra erros individuais
        const inserted = error?.result?.insertedCount ?? 0;
        resumo.totalInseridas += inserted;
        const writeErrors: Array<{ index: number; errmsg: string }> =
          error?.writeErrors ?? [];
        for (const we of writeErrors) {
          const item = chunk[we.index];
          resumo.erros.push({
            linha: item?.idx ?? -1,
            erro: `MongoDB Error: ${we.errmsg}`,
          });
          resumo.totalInvalidas++;
          resumo.totalValidas--;
        }
      }
    }

    // 9. Atualiza lote
    await db
      .update(lotesImportacao)
      .set({
        status: 'concluido',
        totalLidas:      resumo.totalLidas,
        totalValidas:    resumo.totalValidas,
        totalInvalidas:  resumo.totalInvalidas,
        totalInseridas:  resumo.totalInseridas,
        totalDuplicadas: resumo.totalDuplicadas,
        erros: resumo.erros.length ? resumo.erros : null,
      })
      .where(eq(lotesImportacao.id, lote.id));

    return { loteId: lote.id, resumo };

  } catch (err) {
    await db
      .update(lotesImportacao)
      .set({ status: 'falhou', erros: [{ erro: String(err) }] })
      .where(eq(lotesImportacao.id, lote.id));
    throw err;
  }
}
