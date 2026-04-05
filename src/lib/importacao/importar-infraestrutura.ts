import { db } from '@/lib/db';
import { infrastructureRecords } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

const ALIASES: Record<string, string[]> = {
  title: ['titulo', 'title', 'nome', 'item', 'evento'],
  category: ['categoria', 'category', 'tipo', 'grupo'],
  city: ['cidade', 'city', 'municipio'],
  referenceDate: ['data', 'datareferencia', 'data_referencia', 'referencia'],
};

const STRUCTURED_HEADERS = new Set(
  Object.values(ALIASES).flat().map((alias) => normalizeHeader(alias))
);

function get(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const found = Object.entries(row).find(([header]) => normalizeHeader(header) === normalized);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

function buildPayload(row: Record<string, string>) {
  const extras = Object.fromEntries(
    Object.entries(row).filter(([header, value]) => {
      const normalized = normalizeHeader(header);
      return !STRUCTURED_HEADERS.has(normalized) && value.trim() !== '';
    })
  );

  return Object.keys(extras).length ? extras : null;
}

export interface ResumoInfraestrutura {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
}

export async function importarInfraestrutura(
  linhas: Record<string, string>[],
  workspaceId: string
): Promise<ResumoInfraestrutura> {
  const resumo: ResumoInfraestrutura = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
  };

  const registros: typeof infrastructureRecords.$inferInsert[] = [];

  for (let index = 0; index < linhas.length; index++) {
    const row = linhas[index];

    try {
      const referenceDate = parseBRDate(get(row, ALIASES.referenceDate)) ?? new Date();

      registros.push({
        workspaceId,
        title: trimOrNull(get(row, ALIASES.title)),
        category: trimOrNull(get(row, ALIASES.category)),
        city: trimOrNull(get(row, ALIASES.city)),
        referenceDate,
        payload: buildPayload(row),
        periodMonth: referenceDate.getMonth() + 1,
        periodYear: referenceDate.getFullYear(),
      });
    } catch (error) {
      resumo.totalInvalidas++;
      resumo.erros.push({
        linha: index + 2,
        erro: String(error),
      });
    }
  }

  if (registros.length) {
    const CHUNK = 200;
    for (let index = 0; index < registros.length; index += CHUNK) {
      await db.insert(infrastructureRecords).values(registros.slice(index, index + CHUNK));
    }
    resumo.totalInseridas = registros.length;
  }

  return resumo;
}
