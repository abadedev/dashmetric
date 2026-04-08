import { db } from '@/lib/db';
import { infrastructureRecords } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

const ALIASES: Record<string, string[]> = {
  title: ['titulo', 'title', 'nome', 'item', 'evento', 'descricao'],
  category: ['categoria', 'category', 'tipo', 'grupo', 'problema', 'servico', 'problema/servico'],
  city: ['cidade', 'city', 'municipio'],
  referenceDate: ['data', 'datareferencia', 'referencia', 'criado_em'],
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
  const extras: Record<string, string> = {};
  Object.entries(row).forEach(([header, value]) => {
    const normalized = normalizeHeader(header);
    if (!STRUCTURED_HEADERS.has(normalized) && value.trim() !== '') {
      extras[normalized] = value.trim();
    }
  });

  return Object.keys(extras).length ? extras : null;
}

export interface ResumoInfraestrutura {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
}

function extractPeriodFromFilename(fileName?: string | null) {
  const now = new Date();
  if (!fileName) return { month: now.getMonth() + 1, year: now.getFullYear() };
  
  // Ex: "Infraestrutura 01_03 a 31_03.xlsx" -> month 3
  const match = fileName.match(/(\d{2})[_\/\-](\d{2})/);
  if (match) {
    return {
      month: parseInt(match[2], 10),
      year: now.getFullYear(), // Simplified assuming current year
    };
  }
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function truncate(str: string | null | undefined, max: number = 255) {
  if (!str) return null;
  return str.length > max ? str.substring(0, max) : str;
}

export async function importarInfraestrutura(
  linhas: Record<string, string>[],
  workspaceId: string,
  fileName?: string | null
): Promise<ResumoInfraestrutura> {
  const resumo: ResumoInfraestrutura = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
  };

  const registros: typeof infrastructureRecords.$inferInsert[] = [];
  const { month, year } = extractPeriodFromFilename(fileName);

  for (let index = 0; index < linhas.length; index++) {
    const row = linhas[index];

    try {
      const rawDate = get(row, ALIASES.referenceDate);
      let referenceDate = new Date();

      if (rawDate && /^\d{1,2}$/.test(rawDate.trim())) {
        referenceDate = new Date(year, month - 1, parseInt(rawDate, 10));
      } else {
        referenceDate = parseBRDate(rawDate) ?? new Date();
      }

      const payload = buildPayload(row);

      registros.push({
        workspaceId,
        title: truncate(trimOrNull(get(row, ALIASES.title))) || 'Sem Título',
        category: truncate(trimOrNull(get(row, ALIASES.category))),
        city: truncate(trimOrNull(get(row, ALIASES.city))),
        referenceDate,
        payload,
        periodMonth: month,
        periodYear: year,
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
