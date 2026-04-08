import Papa from 'papaparse';
import { normalizeHeader } from './helpers';

const HEADER_KEYWORDS = [
  'tipo', 'indicador', 'tecnico', 'instalador', 'cliente', 'cidade',
  'atendente', 'data_abertura', 'datapedido', 'data_pedido', 'os',
  'n_os', 'plano', 'motivo', 'solucao', 'manut', 'percentual',
  'abertura', 'finalizacao', 'login', 'nome',
  'agente', 'conta', 'servico', 'contato', 'telefone', 'protocolo',
  'canal', 'data_de_entrada', 'data_de_atendimento', 'data_de_fila',
  'tempo_em_fila', 'tempo_de_atendimento', 'tempo_em_pendencia',
  'tmic', 'tmia', 'status', 'classificacao', 'ativo_receptivo', 'qic', 'qia',
];

function scoreHeaderRow(cells: string[]): number {
  return cells.filter((cell) => {
    if (!cell) return false;
    const norm = normalizeHeader(cell.toString());
    return HEADER_KEYWORDS.some((kw) => norm.includes(kw) || kw.includes(norm));
  }).length;
}

export function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8');
  return utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8;
}

export function parseCsv(content: string | Buffer): Record<string, string>[] {
  const normalizedContent = Buffer.isBuffer(content) ? decodeCsvBuffer(content) : content;
  const contentWithoutBom = normalizedContent.replace(/^\uFEFF/, '');

  const delimiter = contentWithoutBom.substring(0, 1000).includes(';') ? ';' : ',';

  const allLines = contentWithoutBom.split('\n');
  let headerRowIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < Math.min(10, allLines.length); i++) {
    const cells = allLines[i].split(delimiter).map((c) => c.trim());
    const score = scoreHeaderRow(cells);
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
    }
  }

  const contentFromHeader = allLines.slice(headerRowIndex).join('\n');

  const result = Papa.parse<Record<string, string>>(contentFromHeader, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter,
    transformHeader: normalizeHeader,
  });

  return result.data.filter((row) =>
    Object.values(row).some((v) => v?.trim() !== '')
  );
}
