import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lotesImportacao, importacoesBrutas, technicians, holidays, atendimentos } from '@/lib/db/schema';
import type { NewAtendimento } from '@/lib/db/schema';

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
  workspaceId: string,
  nomes: Set<string>,
  loginMap: Map<string, string>
): Promise<Map<string, number>> {
  const cache = new Map<string, number>();

  for (const nome of nomes) {
    if (!nome) continue;

    const existing = await db.query.technicians.findFirst({
      where: (t, { or, eq: eqFn, and: andFn }) => andFn(
        eqFn(t.workspaceId, workspaceId),
        or(eqFn(t.name, nome), eqFn(t.login, nome)),
      ),
    });

    if (existing) {
      // Preenche login se ainda não tiver
      const loginCode = loginMap.get(nome) ?? null;
      if (!existing.login && loginCode) {
        await db
          .update(technicians)
          .set({ login: loginCode, updatedAt: new Date() })
          .where(and(eq(technicians.id, existing.id), eq(technicians.workspaceId, workspaceId)));
      }
      cache.set(nome, existing.id);
    } else {
      const [created] = await db
        .insert(technicians)
        .values({ workspaceId, name: nome, login: loginMap.get(nome) ?? null })
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

type AttendanceInsertRow = {
  idx: number;
  dados: Record<string, unknown>;
};

type AttendanceInsertResult = {
  inserted: number;
  duplicated: number;
  errored: number;
  errors: Array<{ linha: number; erro: string }>;
};

type AttendanceInsertHandlers = {
  insertMany?: (values: Array<NewAtendimento & { workspaceId: string; createdAt: Date; updatedAt: Date }>) => Promise<Array<{ id: number }>>;
  insertOne?: (value: NewAtendimento & { workspaceId: string; createdAt: Date; updatedAt: Date }) => Promise<Array<{ id: number }>>;
};

export async function insertAttendanceChunk(
  chunk: AttendanceInsertRow[],
  workspaceId: string,
  now: Date,
  handlers: AttendanceInsertHandlers = {},
): Promise<AttendanceInsertResult> {
  const insertMany = handlers.insertMany ?? ((values) =>
    db
      .insert(atendimentos)
      .values(values)
      .onConflictDoNothing({ target: [atendimentos.workspaceId, atendimentos.hashImportacao] })
      .returning({ id: atendimentos.id }));

  const insertOne = handlers.insertOne ?? ((value) =>
    db
      .insert(atendimentos)
      .values(value)
      .onConflictDoNothing({ target: [atendimentos.workspaceId, atendimentos.hashImportacao] })
      .returning({ id: atendimentos.id }));

  const values = chunk.map((item) => ({
    ...(item.dados as NewAtendimento),
    workspaceId,
    createdAt: now,
    updatedAt: now,
  }));

  try {
    const insertedRows = await insertMany(values);
    return {
      inserted: insertedRows.length,
      duplicated: chunk.length - insertedRows.length,
      errored: 0,
      errors: [],
    };
  } catch (error: unknown) {
    console.error('[importar-atendimentos] batch insert failed, falling back to row-by-row', {
      workspaceId,
      chunkSize: chunk.length,
      error: error instanceof Error ? error.message : String(error),
    });

    let inserted = 0;
    let duplicated = 0;
    let errored = 0;
    const errors: Array<{ linha: number; erro: string }> = [];

    for (const item of chunk) {
      try {
        const insertedRow = await insertOne({
          ...(item.dados as NewAtendimento),
          workspaceId,
          createdAt: now,
          updatedAt: now,
        });

        if (insertedRow.length > 0) {
          inserted++;
        } else {
          duplicated++;
        }
      } catch (itemErr: unknown) {
        const cause = itemErr instanceof Error ? itemErr.message : String(itemErr);
        errored++;
        errors.push({
          linha: item.idx,
          erro: `PostgreSQL Error: ${cause}`,
        });
      }
    }

    return { inserted, duplicated, errored, errors };
  }
}

// ── Serviço principal ─────────────────────────────────────────────────────────

export async function importarAtendimentos(
  buffer: Buffer,
  filename: string,
  workspaceId: string,
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
    .values({ workspaceId, arquivo: filename, tipoArquivo, status: 'processando' })
    .returning();

  const resumo: ResumoImportacao = {
    totalLidas:      linhasBrutas.length,
    totalValidas:    0,
    totalInvalidas:  0,
    totalInseridas:  0,
    totalDuplicadas: 0,
    erros:           [],
    warnings:        [],
  };

  try {
    // 3. Salva linhas brutas para auditoria apenas quando explicitamente habilitado.
    if (SHOULD_STORE_RAW_IMPORT_ROWS && linhasBrutas.length) {
      const CHUNK_BRUTO = 200;
      for (let i = 0; i < linhasBrutas.length; i += CHUNK_BRUTO) {
        await db.insert(importacoesBrutas).values(
          linhasBrutas.slice(i, i + CHUNK_BRUTO).map((raw) => ({
            workspaceId,
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
    (linhasBrutas as unknown[]).length = 0;

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

    const tecnicoCache = await resolverTecnicos(workspaceId, nomesTecnicos, loginMap);

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
          normalizada as never,
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

    // 7. Deduplicação dentro do próprio lote (caso o arquivo tenha linhas repetidas)
    const hashesNoLote = new Set<string>();
    const paraInserir = registrosMapeados.filter((r) => {
      const hash = r.dados.hashImportacao as string;
      if (hashesNoLote.has(hash)) {
        resumo.totalDuplicadas++;
        return false;
      }
      hashesNoLote.add(hash);
      return true;
    });

    // 8. Insere no PostgreSQL em lotes de 200
    // (200 linhas × ~50 campos = ~10.000 parâmetros por batch, bem abaixo do limite do PG)
    const CHUNK_INSERT = 200;
    const now = new Date();

    for (let i = 0; i < paraInserir.length; i += CHUNK_INSERT) {
      const chunk = paraInserir.slice(i, i + CHUNK_INSERT);
      const result = await insertAttendanceChunk(chunk, workspaceId, now);
      resumo.totalInseridas += result.inserted;
      resumo.totalDuplicadas += result.duplicated;
      resumo.totalInvalidas += result.errored;
      resumo.totalValidas -= result.errored;
      resumo.erros.push(...result.errors);
    }

    // 9. Atualiza lote
    await db
      .update(lotesImportacao)
      .set({
        status:          'concluido',
        totalLidas:      resumo.totalLidas,
        totalValidas:    resumo.totalValidas,
        totalInvalidas:  resumo.totalInvalidas,
        totalInseridas:  resumo.totalInseridas,
        totalDuplicadas: resumo.totalDuplicadas,
        erros:           resumo.erros.length ? resumo.erros : null,
      })
      .where(eq(lotesImportacao.id, lote.id));

    return { loteId: lote.id, resumo };

  } catch (err) {
    console.error('[importar-atendimentos] import failed', {
      workspaceId,
      filename,
      loteId: lote.id,
      error: err instanceof Error ? err.message : String(err),
    });
    await db
      .update(lotesImportacao)
      .set({ status: 'falhou', erros: [{ erro: String(err) }] })
      .where(eq(lotesImportacao.id, lote.id));
    throw err;
  }
}
