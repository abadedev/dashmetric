/**
 * processar-inviabilidade-ict.ts
 *
 * Pré-processador para a planilha manual de inviabilidade técnica (ICT) da DSTech.
 *
 * Estrutura da planilha:
 *   dataPedido | Instalador | Login | Cliente | inviabilidade técnica | Instalação cancelada | Cliente foi instalado
 *
 * Linhas com "x" na coluna "inviabilidade técnica" são cancelamentos por ICT.
 *
 * O que este módulo faz:
 *   1. Filtra as linhas com "x" (case-insensitive) na coluna de inviabilidade
 *   2. Divide "dataPedido" no formato "DD/MM/YY - HH:MM" em data + hora separados
 *      (usando splitBRDateTime, que também suporta "Ontem - 16:36", "Anteontem - 12:06")
 *   3. Retorna linhas normalizadas prontas para importarQualidade, com indicador = 'ICT'
 */

import { splitBRDateTime, normalizeHeader } from './helpers';

export interface ResultadoICT {
  linhasParaImportar: Record<string, string>[];
  totalLidas: number;
  totalICT: number;
  totalIgnoradas: number;
}

// Todas as variações possíveis do nome da coluna de inviabilidade técnica
const ALIASES_INVIABILIDADE = [
  'inviabilidade tecnica',
  'inviabilidade_tecnica',
  'inviabilidade técnica',
  'inviabilidade',
  'ict',
];

function encontrarColunaICT(row: Record<string, string>): string | undefined {
  const rowKeys = Object.keys(row);
  for (const k of rowKeys) {
    const nk = normalizeHeader(k);
    if (nk.includes('inviabilidade') || nk.includes('ict')) {
      return k;
    }
  }
  return undefined;
}

/**
 * Localiza o valor de uma coluna pelo nome normalizado.
 * Tolerante a variações de maiúsculas, acentos e espaços.
 */
function getCol(row: Record<string, string>, nome: string): string {
  const nomeNorm = normalizeHeader(nome);
  const rowKeys = Object.keys(row);

  // Correspondência exata normalizada (normalizeHeader é idempotente nas chaves já normalizadas)
  const exact = rowKeys.find((k) => normalizeHeader(k) === nomeNorm);
  if (exact) return row[exact]?.trim() ?? '';

  // Substring — garante que 'datapedido' bate em 'data_pedido' e vice-versa
  const partial = rowKeys.find((k) => {
    const kNorm = normalizeHeader(k);
    return kNorm.includes(nomeNorm) || nomeNorm.includes(kNorm);
  });
  return partial ? (row[partial]?.trim() ?? '') : '';
}

function isX(val: string): boolean {
  return val.trim().toLowerCase() === 'x';
}

export function processarInviabilidadeICT(
  linhasBrutas: Record<string, string>[]
): ResultadoICT {
  const linhasParaImportar: Record<string, string>[] = [];
  let totalIgnoradas = 0;

  // Detecta a chave da coluna uma única vez a partir da primeira linha
  const colunaICT = linhasBrutas.length > 0 ? encontrarColunaICT(linhasBrutas[0]) : undefined;

  for (const row of linhasBrutas) {
    // Usa a chave encontrada diretamente — evita re-normalizar em cada iteração
    const flagICT = colunaICT ? (row[colunaICT]?.trim() ?? '') : '';

    if (!isX(flagICT)) {
      totalIgnoradas++;
      continue;
    }

    const dataPedidoRaw = getCol(row, 'dataPedido');
    const { date, time } = splitBRDateTime(dataPedidoRaw);

    const instalador = getCol(row, 'Instalador');
    const login = getCol(row, 'Login');
    const cliente = getCol(row, 'Cliente');

    // Monta linha no formato que importarQualidade entende
    linhasParaImportar.push({
      indicador: 'ICT',
      data_abertura: date,
      hora_inicio: time,
      instalador,
      cliente,
      // Login não tem campo na tabela — registra no motivo para rastreabilidade
      motivo: login ? `Login: ${login}` : '',
    });
  }

  return {
    linhasParaImportar,
    totalLidas: linhasBrutas.length,
    totalICT: linhasParaImportar.length,
    totalIgnoradas,
  };
}
