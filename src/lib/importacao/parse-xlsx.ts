// @ts-expect-error – node-xlsx-parser não tem types declarados
import XLSXParser from 'node-xlsx-parser';
import { normalizeHeader } from './helpers';
import { parseCsv } from './parse-csv';
import * as XLSX from 'xlsx';

// Keywords que indicam que uma linha é a linha de headers real
const HEADER_KEYWORDS = [
  'tipo', 'indicador', 'tecnico', 'instalador', 'cliente', 'cidade',
  'atendente', 'data_abertura', 'datapedido', 'data_pedido', 'os',
  'n_os', 'plano', 'motivo', 'solucao', 'manut', 'percentual',
  'abertura', 'finalizacao',
];

/**
 * Retorna o score (número de keywords encontradas).
 */
function scoreHeaderRow(cells: string[]): number {
  return cells.filter((cell) => {
    if (!cell) return false;
    const norm = normalizeHeader(cell.toString());
    return HEADER_KEYWORDS.some((kw) => norm.includes(kw) || kw.includes(norm));
  }).length;
}

/**
 * Converte um buffer XLSX/XLS para array de objetos com headers normalizados.
 *
 * DETECÇÃO INTELIGENTE DE HEADER:
 * Ignora linhas de título no começo da planilha que apenas descrevem filtros ou o nome do relatorio.
 */
export function parseXlsx(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });

  // Tenta cada aba e descobre a aba com melhor score e a linha exata de cabeçalho
  let bestSheet = workbook.SheetNames[0];
  let bestScore = -1;
  let bestHeaderRowIdx = 0;

  // Limite de 10 linhas para detectar o header — evita carregar o arquivo inteiro em memória
  const HEADER_SCAN_RANGE = { s: { c: 0, r: 0 }, e: { c: 255, r: 9 } };

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    // header: 1 FORÇA O RETORNO COMO ARRAY DE ARRAYS `any[][]`
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
      range: HEADER_SCAN_RANGE,
    });

    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const cells = rawRows[r];
      if (!Array.isArray(cells)) continue;
      
      const strCells = cells.map(String);
      const score = scoreHeaderRow(strCells);
      if (score > bestScore) {
        bestScore = score;
        bestSheet = sheetName;
        bestHeaderRowIdx = r;
      }
    }
  }

  // Agora extrai o JSON da aba vencedora
  const ws = workbook.Sheets[bestSheet];
  const allRows = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!allRows.length || bestScore === -1) return [];

  const rawHeaderLine = allRows[bestHeaderRowIdx] ?? [];
  const headerCells = rawHeaderLine.map((c) => normalizeHeader(String(c ?? '')));

  // Converte as linhas seguintes para array de objetos
  const dataRows: Record<string, string>[] = [];
  
  for (let r = bestHeaderRowIdx + 1; r < allRows.length; r++) {
    const rowCells = allRows[r] ?? [];
    
    // Ignora linha vazia
    if (!rowCells.some((v) => String(v ?? '').trim() !== '')) continue;

    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headerCells.length; c++) {
      const key = headerCells[c];
      if (key) { // Só importa colunas que têm cabeçalho
        rowObj[key] = String(rowCells[c] ?? '').trim();
      }
    }
    dataRows.push(rowObj);
  }

  return dataRows;
}
