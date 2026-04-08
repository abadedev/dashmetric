/**
 * importar-omnichannel-vendas.ts
 *
 * Parser e persistência para a planilha Omni Vendas.
 *
 * Formato: CSV delimitado por ponto-e-vírgula (;), uma linha por atendimento.
 *
 * Colunas relevantes:
 *   Agente            — nome do atendente (vazio = automático, ignorar)
 *   Tempo em Fila     — HH:MM:SS
 *   Tempo de Atendimento — HH:MM:SS
 *   Tempo em Pendência — HH:MM:SS
 *   TMIC              — HH:MM:SS
 *   TMIA              — HH:MM:SS
 *   Data de Entrada   — DD/MM/YYYY HH:MM:SS (usado para detectar período)
 *
 * Saída: um registro agregado por agente (média dos tempos, contagem total)
 * armazenado em `omnichannel_sales_records`.
 */

import { db } from '@/lib/db';
import { omnichannelSalesRecords } from '@/lib/db/schema';
import { normalizeHeader } from './helpers';
import { extrairPeriodoDoNomeArquivo, type PeriodoOmnichannel } from './omnichannel-periodo';

export interface ResumoOmnichannelVendas {
  totalLidas: number;
  totalInseridas: number;
  totalIgnoradas: number;
  agentesProcessados: number;
  startDate: string | null;
  endDate: string | null;
}

// Colunas essenciais para aceitar o arquivo
const COLUNAS_ESSENCIAIS = ['agente', 'tempo em fila', 'tempo de atendimento', 'serviço/tipo'];

// Alias map: normalizeHeader(original column name) → internal field name
// normalizeHeader replaces spaces with underscores, so "Tempo em Fila" → "tempo_em_fila"
const COL_MAP: Record<string, string> = {
  agente: 'agente',
  // tempo em fila
  tempo_em_fila: 'tempo_fila',
  fila: 'tempo_fila',
  // tempo de atendimento
  tempo_de_atendimento: 'tempo_atendimento',
  atendimento: 'tempo_atendimento',
  // tempo em pendência
  tempo_em_pendencia: 'tempo_pendencia',
  tempo_pendencia: 'tempo_pendencia',
  pendencia: 'tempo_pendencia',
  // TMIC / TMIA
  tmic: 'tmic',
  tmia: 'tmia',
  // data de entrada para detecção do período
  data_de_entrada: 'data_entrada',
  data_entrada: 'data_entrada',
  data: 'data_entrada',
  // identificação de vendas
  servico: 'servico_tipo',
  servico_tipo: 'servico_tipo',
  tipo: 'servico_tipo',
  classificacao: 'classificacao',
};

const SALES_VALUES = new Set(['vendas', 'venda']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function buildColIndex(row: Record<string, string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const k of Object.keys(row)) {
    // Row keys are already normalized by parseCsv via normalizeHeader (spaces → underscores).
    // Apply normalizeHeader once more to handle any residual variation.
    const norm = normalizeHeader(k);
    const mapped = COL_MAP[norm];
    if (mapped && !index.has(mapped)) {
      index.set(mapped, k);
    }
  }
  return index;
}

function getVal(row: Record<string, string>, colIndex: Map<string, string>, col: string): string {
  const key = colIndex.get(col);
  return key ? (row[key]?.trim() ?? '') : '';
}

function getSalesMarker(row: Record<string, string>, colIndex: Map<string, string>): string {
  const servico = getVal(row, colIndex, 'servico_tipo');
  if (servico) return servico;

  const classificacao = getVal(row, colIndex, 'classificacao');
  if (classificacao) return classificacao;

  return '';
}

/** Converte HH:MM:SS ou MM:SS para total de segundos */
function toSeconds(val: string): number {
  const v = val.trim();
  if (!v) return 0;
  const parts = v.split(':').map(Number);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return 0;
}

/** Converte segundos inteiros para string HH:MM:SS */
function fromSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Extrai {month, year} da coluna "Data de Entrada" (DD/MM/YYYY ...) */
function parsePeriodoFromDate(val: string): { month: number; year: number } | null {
  const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || year < 2000) return null;
  return { month, year };
}

// ─── Validação de headers ─────────────────────────────────────────────────────

export function validarHeadersOmnichannelVendas(rows: Record<string, string>[]): void {
  if (!rows.length) throw new Error('Arquivo vazio.');

  // Row keys are already in normalizeHeader format (spaces → underscores).
  const normalizedKeys = Object.keys(rows[0]).map(normalizeHeader);
  const missing: string[] = [];
  const requiredColumns = [
    { label: 'agente', internal: 'agente' },
    { label: 'tempo em fila', internal: 'tempo_fila' },
    { label: 'tempo de atendimento', internal: 'tempo_atendimento' },
    { label: 'serviço/tipo', internal: 'servico_tipo', alternates: ['classificacao'] },
  ];

  for (const required of requiredColumns) {
    // normalizeHeader converts "tempo em fila" → "tempo_em_fila", matching COL_MAP keys.
    const reqNorm = normalizeHeader(required.label);
    const found = normalizedKeys.some((k) => {
      if (k === reqNorm) return true;
      if (COL_MAP[k] === required.internal) return true;
      if (required.alternates?.includes(COL_MAP[k])) return true;
      return false;
    });
    if (!found) missing.push(required.label);
  }

  if (missing.length) {
    throw new Error(
      `Planilha Omni Vendas inválida. Colunas essenciais ausentes: ${missing.join(', ')}. ` +
        `Verifique se o arquivo é do formato correto (Agente, Serviço, Tempo em Fila, Tempo de Atendimento, etc.).`
    );
  }
}

// ─── Importação principal ─────────────────────────────────────────────────────

interface AgentAccumulator {
  tempoFilaTotal: number;
  tempoAtendTotal: number;
  tempoPendTotal: number;
  tmicTotal: number;
  tmiaTotal: number;
  count: number;
  countFila: number;
  countAtend: number;
  countPend: number;
  countTmic: number;
  countTmia: number;
}

export function isSalesValue(value: string): boolean {
  const normalized = normalizeHeader(value);
  if (!normalized) return false;
  return SALES_VALUES.has(normalized);
}

export function isOmniVendasRow(row: Record<string, string>, colIndex: Map<string, string>): boolean {
  return isSalesValue(getSalesMarker(row, colIndex));
}

function resolvePeriodo(rows: Record<string, string>[], colIndex: Map<string, string>, fileName?: string): PeriodoOmnichannel | null {
  if (fileName) {
    const periodoFromFileName = extrairPeriodoDoNomeArquivo(fileName);
    if (periodoFromFileName) return periodoFromFileName;
  }

  for (const row of rows) {
    const dataEntrada = getVal(row, colIndex, 'data_entrada');
    const periodo = parsePeriodoFromDate(dataEntrada);
    if (!periodo) continue;
    const lastDay = new Date(periodo.year, periodo.month, 0).getDate();

    return {
      startDate: `${periodo.year}-${String(periodo.month).padStart(2, '0')}-01`,
      endDate: `${periodo.year}-${String(periodo.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      periodMonth: periodo.month,
      periodYear: periodo.year,
    };
  }

  return null;
}

export async function importarOmnichannelVendas(
  rows: Record<string, string>[],
  workspaceId: string,
  fileName?: string
): Promise<ResumoOmnichannelVendas> {
  validarHeadersOmnichannelVendas(rows);

  const colIndex = buildColIndex(rows[0]);

  // Detecta período do nome do arquivo; fallback para data de entrada da planilha
  const now = new Date();
  let periodMonth = now.getMonth() + 1;
  let periodYear = now.getFullYear();
  let startDate: string | null = null;
  let endDate: string | null = null;
  const periodo = resolvePeriodo(rows, colIndex, fileName);
  if (periodo) {
    periodMonth = periodo.periodMonth;
    periodYear = periodo.periodYear;
    startDate = periodo.startDate;
    endDate = periodo.endDate ?? null;
  }

  // Agrega por agente
  const map = new Map<string, AgentAccumulator>();
  let totalIgnoradas = 0;

  for (const row of rows) {
    if (!isOmniVendasRow(row, colIndex)) {
      totalIgnoradas++;
      continue;
    }

    const agente = getVal(row, colIndex, 'agente').trim();
    if (!agente) {
      totalIgnoradas++;
      continue;
    }

    if (!map.has(agente)) {
      map.set(agente, {
        tempoFilaTotal: 0, tempoAtendTotal: 0, tempoPendTotal: 0,
        tmicTotal: 0, tmiaTotal: 0,
        count: 0,
        countFila: 0, countAtend: 0, countPend: 0, countTmic: 0, countTmia: 0,
      });
    }

    const acc = map.get(agente)!;
    acc.count++;

    const fila = toSeconds(getVal(row, colIndex, 'tempo_fila'));
    if (fila > 0) { acc.tempoFilaTotal += fila; acc.countFila++; }

    const atend = toSeconds(getVal(row, colIndex, 'tempo_atendimento'));
    if (atend > 0) { acc.tempoAtendTotal += atend; acc.countAtend++; }

    const pend = toSeconds(getVal(row, colIndex, 'tempo_pendencia'));
    if (pend > 0) { acc.tempoPendTotal += pend; acc.countPend++; }

    const tmic = toSeconds(getVal(row, colIndex, 'tmic'));
    if (tmic > 0) { acc.tmicTotal += tmic; acc.countTmic++; }

    const tmia = toSeconds(getVal(row, colIndex, 'tmia'));
    if (tmia > 0) { acc.tmiaTotal += tmia; acc.countTmia++; }
  }

  if (map.size === 0) {
    return { totalLidas: rows.length, totalInseridas: 0, totalIgnoradas, agentesProcessados: 0, startDate, endDate };
  }

  // Calcula TMA = média(tempo_atendimento) por convenção Omni
  const registros: (typeof omnichannelSalesRecords.$inferInsert)[] = [];
  for (const [agente, acc] of map.entries()) {
    const avgFila  = acc.countFila  > 0 ? Math.round(acc.tempoFilaTotal  / acc.countFila)  : 0;
    const avgAtend = acc.countAtend > 0 ? Math.round(acc.tempoAtendTotal / acc.countAtend) : 0;
    const avgPend  = acc.countPend  > 0 ? Math.round(acc.tempoPendTotal  / acc.countPend)  : 0;
    const avgTmic  = acc.countTmic  > 0 ? Math.round(acc.tmicTotal       / acc.countTmic)  : 0;
    const avgTmia  = acc.countTmia  > 0 ? Math.round(acc.tmiaTotal       / acc.countTmia)  : 0;

    registros.push({
      workspaceId,
      agente,
      quantidade: acc.count,
      tma:              avgAtend > 0 ? fromSeconds(avgAtend) : null,
      tempoFila:        avgFila  > 0 ? fromSeconds(avgFila)  : null,
      tempoAtendimento: avgAtend > 0 ? fromSeconds(avgAtend) : null,
      tempoPendencia:   avgPend  > 0 ? fromSeconds(avgPend)  : null,
      tmic:             avgTmic  > 0 ? fromSeconds(avgTmic)  : null,
      tmia:             avgTmia  > 0 ? fromSeconds(avgTmia)  : null,
      periodMonth,
      periodYear,
    });
  }

  const inserted = await db
    .insert(omnichannelSalesRecords)
    .values(registros)
    .returning({ id: omnichannelSalesRecords.id });

  return {
    totalLidas: rows.length,
    totalInseridas: inserted.length,
    totalIgnoradas,
    agentesProcessados: map.size,
    startDate,
    endDate,
  };
}
