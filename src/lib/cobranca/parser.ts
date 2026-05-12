import * as XLSX from 'xlsx';
import type { NewCobrancaRegistro } from '@/lib/db/schema';

export type TipoLista = 'boletos_vencidos' | 'pre_inativacao';

interface ParseResult {
  registros: NewCobrancaRegistro[];
  totalLinhas: number;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === 'inativo' || s === '-' || s.toLowerCase() === 'null') {
    return null;
  }
  return s;
}

function rawText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s || null;
}

function extractClientName(raw: string | null): { nome: string; codigo: string | null } {
  if (!raw) return { nome: '', codigo: null };
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    const codigo = match[2].trim();
    const codigoNormalized = /^\d+$/.test(codigo) ? codigo : null;
    return { nome: match[1].trim(), codigo: codigoNormalized };
  }
  return { nome: raw.trim(), codigo: null };
}

function validateDate(date: Date | null): Date | null {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return date;
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return validateDate(value);
  }

  if (typeof value === 'number') {
    // Excel serial date
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return validateDate(date);
  }

  const s = String(value).trim();
  if (!s || s.toLowerCase() === 'inativo' || s === '-') return null;

  // Formato com barra: duas convenções convivem na mesma planilha.
  //  - "4/10/26"      → ano com 2 dígitos = exportado pelo sistema em MM/DD/YY (US).
  //  - "10/04/2026"   → ano com 4 dígitos = digitação manual no Brasil em DD/MM/YYYY.
  //  - Disambiguação extra por valor: se uma das partes > 12, ela só pode ser dia.
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const yearRaw = slash[3];
    let y = parseInt(yearRaw, 10);
    if (y < 100) y += 2000;

    let isDayFirst: boolean;
    if (a > 12) isDayFirst = true;        // a só pode ser dia
    else if (b > 12) isDayFirst = false;  // b só pode ser dia → a é mês
    else isDayFirst = yearRaw.length === 4; // ambíguo → ano 4 dígitos = BR, 2 = US

    const month = (isDayFirst ? b : a) - 1;
    const day = isDayFirst ? a : b;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return validateDate(new Date(Date.UTC(y, month, day)));
  }

  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return validateDate(
      new Date(`${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}T00:00:00Z`)
    );
  }

  // String numérica → serial do Excel
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    const utcDays = Math.floor(n - 25569);
    return validateDate(new Date(utcDays * 86400 * 1000));
  }

  return validateDate(new Date(s));
}

function parseValor(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value.toFixed(2);
  let s = String(value).trim();
  if (!s) return null;
  // Remove R$, spaces, thousand separators
  s = s.replace(/R\$\s*/gi, '').replace(/\s/g, '');
  // Brazilian format: 1.234,56 -> 1234.56
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n.toFixed(2);
}

function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim().toLowerCase();
  if (['sim', 's', 'true', '1', 'yes'].includes(s)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'no'].includes(s)) return false;
  return null;
}

function normalizeStatusSistema(value: unknown): string | null {
  const s = rawText(value);
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower.includes('em dia') || lower.includes('endia')) return 'Em dia';
  if (lower.includes('bloque')) return 'Bloqueado';
  if (lower.includes('inativo') || lower.includes('inativa')) return 'Inativo';
  if (lower.includes('aviso') || lower.includes('pendenc')) return 'Aviso de pendência';
  return s;
}

function normalizarStatusCrm(obs: string | null, corCelula: string | null): string {
  if (corCelula && corCelula.toUpperCase().includes('C6EFCE')) return 'convertido';
  if (!obs || obs.trim() === '') return 'pendente';
  const o = obs.toLowerCase().trim();
  if (o.includes('pagou') || o.includes('pagamento realizado') || o.includes('pgamento')) return 'convertido';
  if (
    o.includes('caixa postal') ||
    o.includes('número incorreto') ||
    o.includes('numero incorreto') ||
    o.includes('bloqueado') ||
    o.includes('indisponiv') ||
    o.includes('terceiro informa') ||
    o.includes('não é o titular') ||
    o.includes('nao e o titular')
  ) {
    return 'sem_contato';
  }
  if (o.includes('desligou') || o.includes('desligado')) return 'desligou';
  if (o.includes('retirada finalizada')) return 'retirada_finalizada';
  if (o.includes('retirada em aberto') || o.includes('retirada em aberta')) return 'retirada_em_aberto';
  if (o.includes('cancelamento') || o.includes('cancelar')) return 'cancelamento_confirmado';
  if (o.includes('devolv') || o.includes('entregar') || o.includes('aparelho')) return 'promessa_devolucao';
  if (
    o.includes('pagar') ||
    o.includes('pagará') ||
    o.includes('reativar') ||
    o.includes('débitos') ||
    o.includes('debitos')
  ) {
    return 'promessa_pagamento';
  }
  return 'pendente';
}

function findHeaderRow(rows: unknown[][]): number {
  const keywords = ['cliente', 'vencimento', 'valor', 'status', 'cidade', 'telefone', 'observa'];
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const matches = row.filter((cell) => {
      if (cell === null || cell === undefined) return false;
      const s = String(cell).toLowerCase();
      return keywords.some((kw) => s.includes(kw));
    }).length;
    if (matches >= 3) return i;
  }
  return 0;
}

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, idx) => {
    if (cell === null || cell === undefined) return;
    const key = String(cell).toLowerCase().trim();
    map[key] = idx;
  });
  return map;
}

/**
 * Resolve uma coluna pelo nome EXATO do header (case + acento insensitive).
 * Não usa match parcial — evita capturar coluna errada (ex: "Data de Bloqueio"
 * sendo lida como "vencimento" só porque ambas têm "data").
 */
function findColExact(map: Record<string, number>, ...candidates: string[]): number | null {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\?/g, '')
      .trim();
  const normalizedMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) normalizedMap[norm(k)] = v;
  for (const c of candidates) {
    const nc = norm(c);
    if (nc in normalizedMap) return normalizedMap[nc];
  }
  return null;
}

function cellColor(ws: XLSX.WorkSheet, col: number, row: number): string | null {
  const ref = XLSX.utils.encode_cell({ c: col, r: row });
  const cell = ws[ref] as { s?: { patternFill?: { fgColor?: { rgb?: string } }; fgColor?: { rgb?: string }; bgColor?: { rgb?: string } } } | undefined;
  if (!cell || !cell.s) return null;
  const fg = cell.s.patternFill?.fgColor?.rgb ?? cell.s.fgColor?.rgb ?? cell.s.bgColor?.rgb;
  return fg ?? null;
}

export function parseCobrancaXlsx(buffer: Buffer, tipoLista: TipoLista): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellStyles: true });
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: false }) as unknown[][];

  if (!rows.length) return { registros: [], totalLinhas: 0 };

  const headerIdx = findHeaderRow(rows);
  const colMap = buildColumnMap(rows[headerIdx] as unknown[]);

  console.log(
    `[cobranca/parser] tipoLista=${tipoLista} headerRow=${headerIdx} headers=${JSON.stringify(
      Object.keys(colMap)
    )}`
  );

  const colCliente = findColExact(colMap, 'cliente');
  const colVencimento = findColExact(colMap, 'vencimento');
  const colValor = findColExact(colMap, 'valor');
  const colCidade = tipoLista === 'boletos_vencidos'
    ? findColExact(colMap, 'inativo', 'cidade')
    : findColExact(colMap, 'cidade');
  const colDataBloqueio = findColExact(colMap, 'data de bloqueio');
  const colTempoCasa = findColExact(colMap, 'tempo de casa');
  const colStatusSistema = findColExact(colMap, 'status');
  const colDataPagamento = findColExact(colMap, 'data de pagamento');
  const colMotivoAtraso = findColExact(colMap, 'motivo do atraso');
  const colPerfilAtraso = findColExact(colMap, 'perfil de atraso', 'perfil de atraso?');
  const colContato = findColExact(colMap, 'contato');
  const colTelefones = findColExact(colMap, 'telefones', 'telefone');
  const colObservacao = findColExact(colMap, 'observacao', 'observacoes', 'observação', 'observações');
  const colMeioContato = findColExact(colMap, 'meio de contato');

  console.log(
    `[cobranca/parser] resolved cols → cliente=${colCliente} vencimento=${colVencimento} valor=${colValor} cidade=${colCidade} dataPagamento=${colDataPagamento} dataBloqueio=${colDataBloqueio} statusSistema=${colStatusSistema} observacao=${colObservacao}`
  );

  const registros: NewCobrancaRegistro[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;

    const clienteRaw = colCliente !== null ? rawText(row[colCliente]) : null;
    if (!clienteRaw) continue;

    const { nome, codigo } = extractClientName(clienteRaw);
    if (!nome) continue;

    const vencimento = colVencimento !== null ? parseDate(row[colVencimento]) : null;
    const valor = colValor !== null ? parseValor(row[colValor]) : null;
    const cidade = colCidade !== null ? normalizeText(row[colCidade]) : null;

    let statusSistema: string | null = null;
    let motivoAtraso: string | null = null;
    let perfilAtraso: boolean | null = null;
    let tempoDeCasa: string | null = null;
    let dataPagamento: Date | null = null;
    let dataBloqueio: Date | null = null;
    let telefone: string | null = null;

    if (tipoLista === 'boletos_vencidos') {
      statusSistema = colStatusSistema !== null ? normalizeStatusSistema(row[colStatusSistema]) : null;
      motivoAtraso = colMotivoAtraso !== null ? normalizeText(row[colMotivoAtraso]) : null;
      perfilAtraso = colPerfilAtraso !== null ? parseBoolean(row[colPerfilAtraso]) : null;
      tempoDeCasa = colTempoCasa !== null ? normalizeText(row[colTempoCasa]) : null;
      dataPagamento = colDataPagamento !== null ? parseDate(row[colDataPagamento]) : null;
      dataBloqueio = colDataBloqueio !== null ? parseDate(row[colDataBloqueio]) : null;
      telefone = colContato !== null ? normalizeText(row[colContato]) : null;
    } else {
      telefone = colTelefones !== null ? normalizeText(row[colTelefones]) : null;
    }

    const observacao = colObservacao !== null ? rawText(row[colObservacao]) : null;
    const meioContato = colMeioContato !== null ? normalizeText(row[colMeioContato]) : null;

    let linhaCor: string | null = null;
    let statusCrm = 'pendente';

    if (tipoLista === 'pre_inativacao') {
      linhaCor = colCliente !== null ? cellColor(ws, colCliente, r) : null;
      statusCrm = normalizarStatusCrm(observacao, linhaCor);
    } else {
      // Para boletos_vencidos, statusCrm é derivado do statusSistema
      if (statusSistema === 'Em dia') statusCrm = 'convertido';
      else if (dataPagamento) statusCrm = 'convertido';
      else statusCrm = 'pendente';
    }

    registros.push({
      clienteNome: nome,
      clienteCodigo: codigo,
      telefone,
      cidade,
      vencimento,
      valor,
      statusSistema,
      motivoAtraso,
      perfilAtraso,
      tempoDeCasa,
      dataPagamento,
      dataBloqueio,
      dataInativo: null,
      statusCrm,
      observacao,
      meioContato,
      tipoLista,
      linhaCor,
    });
  }

  // Dedup: dentro do mesmo arquivo, evitar duplicatas que quebram o ON CONFLICT.
  // Quando não há código, identifica por nome+cidade (mesma regra do índice único parcial no DB).
  const seen = new Set<string>();
  const deduplicados = registros.filter((r) => {
    const identificador = r.clienteCodigo ?? `${r.clienteNome}|${r.cidade ?? ''}`;
    const venc = r.vencimento instanceof Date ? r.vencimento.toISOString() : '';
    const chave = `${identificador}|${venc}|${r.tipoLista}`;
    if (seen.has(chave)) return false;
    seen.add(chave);
    return true;
  });

  return { registros: deduplicados, totalLinhas: rows.length - headerIdx - 1 };
}
