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

import { splitBRDateTime } from './helpers';

export interface ResultadoICT {
  linhasParaImportar: Record<string, string>[];
  totalLidas: number;
  totalICT: number;
  totalIgnoradas: number;
}

function normalizar(str: string): string {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Localiza o valor de uma coluna pelo nome normalizado.
 * Tolerante a variações de maiúsculas, acentos e espaços.
 */
function getCol(row: Record<string, string>, nome: string): string {
  const nomeNorm = normalizar(nome).replace(/\s+/g, '_');
  const rowKeys = Object.keys(row);

  // Correspondência exata normalizada
  const exact = rowKeys.find((k) => normalizar(k).replace(/\s+/g, '_') === nomeNorm);
  if (exact) return row[exact]?.trim() ?? '';

  // Substring
  const partial = rowKeys.find((k) => {
    const kNorm = normalizar(k).replace(/\s+/g, '_');
    return kNorm.includes(nomeNorm) || nomeNorm.includes(kNorm);
  });
  return partial ? (row[partial]?.trim() ?? '') : '';
}

function isX(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'x' || v === 'x ' || v === ' x';
}

export function processarInviabilidadeICT(
  linhasBrutas: Record<string, string>[]
): ResultadoICT {
  const linhasParaImportar: Record<string, string>[] = [];
  let totalIgnoradas = 0;

  for (const row of linhasBrutas) {
    const flagICT = getCol(row, 'inviabilidade tecnica');

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
