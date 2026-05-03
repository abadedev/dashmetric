/**
 * importar-omnichannel.ts
 *
 * Parser e persistência para a planilha Matrix Go (Omnichannel).
 *
 * Colunas esperadas:
 *   Agente | Quantidade | TE | TME | TA | TMA | TP | TMP | TMIC | TMIA | Até 20s | Até 60s | %
 *
 * Regras:
 *   - Valida headers obrigatórios antes de processar
 *   - Ignora linhas vazias
 *   - Ignora linhas de totalização (Total, Geral, Total Geral)
 *   - Linhas de "Robô" ou "Sem Atendente" são armazenadas com isHuman = false
 *   - Converte tempos para string normalizada (HH:MM:SS)
 *   - Converte quantidades e percentuais para número
 *   - O período de referência é extraído do nome do arquivo (não da data do upload)
 */

import { db } from '@/lib/db';
import { omnichannelRecords } from '@/lib/db/schema';
import { normalizeHeader } from './helpers';
import { AGENTES_EXCLUIDOS } from '@/lib/omnichannel/constants';
import { and, eq } from 'drizzle-orm';

export type OmnichannelGrupo = 'geral' | 'admin' | 'suporte' | 'vendas';

export interface ResumoOmnichannel {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  grupo: OmnichannelGrupo;
  periodMonth: number;
  periodYear: number;
  erros: { linha: number; erro: string }[];
}

export interface PeriodoOmnichannel {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  periodMonth: number;
  periodYear: number;
}

// Colunas essenciais — arquivo é rejeitado se alguma estiver ausente
const COLUNAS_ESSENCIAIS = ['agente', 'quantidade', 'tme', 'tma'];

// Aliases para cada coluna esperada (normalizeHeader aplicado)
const COL_MAP: Record<string, string> = {
  agente: 'agente',
  quantidade: 'quantidade',
  te: 'te',
  tme: 'tme',
  ta: 'ta',
  tma: 'tma',
  tp: 'tp',
  tmp: 'tmp',
  tmic: 'tmic',
  tmia: 'tmia',
  ate_20s: 'ate_20s',
  ate20s: 'ate_20s',
  at20s: 'ate_20s',
  ate_60s: 'ate_60s',
  ate60s: 'ate_60s',
  at60s: 'ate_60s',
  percentual: 'percentual',
  '%': 'percentual',
};

const LINHAS_TOTALIZACAO = new Set(['total', 'geral', 'total geral', 'totalgeral']);

// Importado de @/lib/omnichannel/constants — fonte única de verdade
const AGENTES_NAO_HUMANOS = AGENTES_EXCLUIDOS;

// ─── Extração de período a partir do nome do arquivo ──────────────────────────

// Mapa de meses em português normalizados (sem acento)
const MESES_PT: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

/**
 * Extrai mês e ano de referência pelo nome do arquivo buscando nomes de meses em português.
 * Ex: "Omini - Janeiro.xlsx" → { month: 1, year: 2026 }
 *     "Omini - Fevereiro 2025.xlsx" → { month: 2, year: 2025 }
 * Retorna null se nenhum mês for identificado.
 */
/**
 * Detecta o grupo (Geral / Admin / Suporte / Vendas) pelo nome do arquivo.
 * Ex.: "Omini_-_Suporte_Janeiro.xlsx" → 'suporte'.
 * Default: 'geral'.
 */
export function extrairGrupoDoNome(fileName: string): OmnichannelGrupo {
  const name = fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, ' ');

  if (/\badmin/.test(name)) return 'admin';
  if (/\bsuporte/.test(name)) return 'suporte';
  if (/\bvenda/.test(name)) return 'vendas';
  return 'geral';
}

export function extrairMesAnoDoNome(fileName: string): { month: number; year: number } | null {
  const name = fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (março → marco)
    .replace(/[^a-z0-9]/g, ' ');    // não-alfanuméricos → espaço

  let month: number | null = null;
  for (const [mesNome, mesNum] of Object.entries(MESES_PT)) {
    if (name.includes(mesNome)) {
      month = mesNum;
      break;
    }
  }

  if (month === null) return null;

  const yearMatch = name.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  return { month, year };
}

/**
 * Extrai os componentes de uma parte de data em formato BR compacto.
 *
 * Suporta:
 *   DDMM          → 0103, 3103
 *   DDMMYYYY      → 31032026
 *   DD/MM         → 01/03
 *   DD/MM/YYYY    → 31/03/2026
 *   DD-MM         → 01-03
 *   DD-MM-YYYY    → 31-03-2026
 */
function parseDateFragment(
  s: string
): { day: number; month: number; year?: number } | null {
  // Extrai apenas dígitos e separadores / -
  const clean = s.replace(/[^0-9\/\-]/g, '');

  // Com separador: DD/MM/YYYY, DD-MM-YYYY, DD/MM, DD-MM
  const withSep = clean.match(/^(\d{1,2})[\/\-](\d{2})(?:[\/\-](\d{4}))?$/);
  if (withSep) {
    return {
      day: parseInt(withSep[1], 10),
      month: parseInt(withSep[2], 10),
      year: withSep[3] ? parseInt(withSep[3], 10) : undefined,
    };
  }

  // Sem separador — DDMMYYYY (8 dígitos)
  if (/^\d{8}$/.test(clean)) {
    return {
      day: parseInt(clean.slice(0, 2), 10),
      month: parseInt(clean.slice(2, 4), 10),
      year: parseInt(clean.slice(4, 8), 10),
    };
  }

  // Sem separador — DDMM (4 dígitos)
  if (/^\d{4}$/.test(clean)) {
    return {
      day: parseInt(clean.slice(0, 2), 10),
      month: parseInt(clean.slice(2, 4), 10),
    };
  }

  return null;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Tenta extrair o período analítico de referência a partir do nome do arquivo.
 *
 * Padrões suportados (e variações):
 *   "Omini - 0103 a 31032026.xlsx"
 *   "Omni 01/03 a 31/03/2026.xlsx"
 *   "Matrix Go 01-03 a 31-03-2026.xlsx"
 *
 * Estratégia:
 *   1. Localiza o padrão <fragmento_data> [aÀ] <fragmento_data_com_ano> no nome
 *   2. Parseia start (sem ano obrigatório) e end (com ano obrigatório)
 *   3. Deriva periodMonth/periodYear da data final
 *   4. Retorna null se nenhum padrão for encontrado → o chamador usa fallback
 */
export function extrairPeriodoDoNomeArquivo(fileName: string): PeriodoOmnichannel | null {
  // Remove extensão e normaliza espaços
  const name = fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, ' ').trim();

  // Captura dois fragmentos de data separados por " a " ou " à "
  // Ex: "0103 a 31032026", "01/03 a 31/03/2026", "01-03 a 31-03-2026"
  const match = name.match(/(\d[\d\/\-]*\d|\d{4})\s+[aà]\s+(\d[\d\/\-]*\d|\d{8})/i);
  if (!match) return null;

  const startFrag = parseDateFragment(match[1]);
  const endFrag   = parseDateFragment(match[2]);

  // A data final deve obrigatoriamente conter o ano
  if (!endFrag?.year || !startFrag) return null;

  const year = endFrag.year;

  // Validações básicas de sanidade
  if (
    endFrag.month < 1 || endFrag.month > 12 ||
    startFrag.month < 1 || startFrag.month > 12 ||
    endFrag.day < 1 || endFrag.day > 31 ||
    startFrag.day < 1 || startFrag.day > 31 ||
    year < 2000 || year > 2100
  ) {
    return null;
  }

  return {
    startDate: toISODate(year, startFrag.month, startFrag.day),
    endDate:   toISODate(year, endFrag.month, endFrag.day),
    periodMonth: endFrag.month,
    periodYear:  year,
  };
}

// ─── Helpers de parsing de linha ─────────────────────────────────────────────

function buildColIndex(row: Record<string, string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const k of Object.keys(row)) {
    const norm = normalizeHeader(k);
    const mapped = COL_MAP[norm];
    if (mapped) index.set(mapped, k);
  }
  return index;
}

function getVal(row: Record<string, string>, colIndex: Map<string, string>, col: string): string {
  const key = colIndex.get(col);
  return key ? (row[key]?.trim() ?? '') : '';
}

function toInt(val: string): number | null {
  const n = parseInt(val.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function toDecimal(val: string): number | null {
  const cleaned = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normalizeTime(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) return v;
  return v || null;
}

function isTotalizacao(agente: string): boolean {
  return LINHAS_TOTALIZACAO.has(agente.toLowerCase().replace(/\s+/g, ''));
}

function normalizeSegment(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

function isHumanAgent(agente: string): boolean {
  // Separa no "/" para tratar nomes compostos como "Robô/Sem Atendente"
  return !agente.split('/').map(normalizeSegment).some((seg) => AGENTES_NAO_HUMANOS.has(seg));
}

// ─── Validação e importação ───────────────────────────────────────────────────

export async function validarHeadersOmnichannel(rows: Record<string, string>[]): Promise<void> {
  if (!rows.length) throw new Error('Arquivo vazio.');

  const normalizedKeys = Object.keys(rows[0]).map(normalizeHeader);
  const missingColumns: string[] = [];

  for (const required of COLUNAS_ESSENCIAIS) {
    const found = normalizedKeys.some((k) => {
      const mapped = COL_MAP[k];
      return mapped === required || k === required;
    });
    if (!found) missingColumns.push(required.toUpperCase());
  }

  if (missingColumns.length) {
    throw new Error(
      `Planilha Matrix Go inválida. Colunas essenciais ausentes: ${missingColumns.join(', ')}. ` +
      `Verifique se o arquivo é do formato correto (Agente, Quantidade, TE, TME, TA, TMA, TP, TMP, TMIC, TMIA, Até 20s, Até 60s, %).`
    );
  }
}

export async function importarOmnichannel(
  rows: Record<string, string>[],
  workspaceId: string,
  fileName?: string
): Promise<ResumoOmnichannel> {
  await validarHeadersOmnichannel(rows);

  const colIndex = buildColIndex(rows[0]);
  const grupo: OmnichannelGrupo = fileName ? extrairGrupoDoNome(fileName) : 'geral';

  // Período: extraído exclusivamente do nome do arquivo.
  // Tenta primeiro por nome de mês ("Omini - Janeiro.xlsx"),
  // depois pelo padrão de range analítico ("01/03 a 31/03/2026").
  // Rejeita se não conseguir identificar o mês.
  let periodMonth: number;
  let periodYear: number;
  let periodStartDate: string | null = null;
  let periodEndDate: string | null = null;

  const mesAno = fileName ? extrairMesAnoDoNome(fileName) : null;
  if (mesAno) {
    periodMonth = mesAno.month;
    periodYear  = mesAno.year;
  } else {
    const periodo = fileName ? extrairPeriodoDoNomeArquivo(fileName) : null;
    if (periodo) {
      periodMonth     = periodo.periodMonth;
      periodYear      = periodo.periodYear;
      periodStartDate = periodo.startDate;
      periodEndDate   = periodo.endDate;
    } else {
      throw new Error(
        'Não foi possível identificar o mês de referência pelo nome do arquivo. Renomeie para o formato: "Omini - Janeiro.xlsx"'
      );
    }
  }

  const erros: { linha: number; erro: string }[] = [];
  const registros: (typeof omnichannelRecords.$inferInsert)[] = [];
  let totalInvalidas = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const agente = getVal(row, colIndex, 'agente');

    if (!agente) continue;
    if (isTotalizacao(agente)) continue;

    const quantidade = toInt(getVal(row, colIndex, 'quantidade'));
    if (quantidade === null) {
      totalInvalidas++;
      erros.push({ linha: i + 2, erro: `Agente "${agente}": campo Quantidade inválido.` });
      continue;
    }

    registros.push({
      workspaceId,
      agente,
      grupo,
      isHuman: isHumanAgent(agente),
      quantidade,
      te:   normalizeTime(getVal(row, colIndex, 'te')),
      tme:  normalizeTime(getVal(row, colIndex, 'tme')),
      ta:   normalizeTime(getVal(row, colIndex, 'ta')),
      tma:  normalizeTime(getVal(row, colIndex, 'tma')),
      tp:   normalizeTime(getVal(row, colIndex, 'tp')),
      tmp:  normalizeTime(getVal(row, colIndex, 'tmp')),
      tmic: normalizeTime(getVal(row, colIndex, 'tmic')),
      tmia: normalizeTime(getVal(row, colIndex, 'tmia')),
      at20s: toInt(getVal(row, colIndex, 'ate_20s')),
      at60s: toInt(getVal(row, colIndex, 'ate_60s')),
      percentual: toDecimal(getVal(row, colIndex, 'percentual'))?.toString() ?? null,
      periodStartDate,
      periodEndDate,
      periodMonth,
      periodYear,
    });
  }

  let totalInseridas = 0;
  if (registros.length > 0) {
    // Reimport: limpa o conjunto anterior do mesmo workspace+grupo+período antes de inserir
    await db
      .delete(omnichannelRecords)
      .where(
        and(
          eq(omnichannelRecords.workspaceId, workspaceId),
          eq(omnichannelRecords.grupo, grupo),
          eq(omnichannelRecords.periodMonth, periodMonth),
          eq(omnichannelRecords.periodYear, periodYear),
        )
      );

    const inserted = await db
      .insert(omnichannelRecords)
      .values(registros)
      .returning({ id: omnichannelRecords.id });
    totalInseridas = inserted.length;
  }

  return {
    totalLidas: rows.length,
    totalInseridas,
    totalInvalidas,
    grupo,
    periodMonth,
    periodYear,
    erros: erros.slice(0, 20),
  };
}
