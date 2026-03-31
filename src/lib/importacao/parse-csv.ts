import Papa from 'papaparse';
import { normalizeHeader } from './helpers';

/**
 * Faz parse de uma string CSV para um array de objetos com headers normalizados.
 * Aceita delimitador ';' ou ',' (detecta automaticamente).
 * Linhas completamente vazias são ignoradas.
 */
export function parseCsv(content: string): Record<string, string>[] {
  const delimiter = content.substring(0, 1000).includes(';') ? ';' : ',';

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter,
    transformHeader: normalizeHeader,
  });

  // Filtra linhas onde todos os valores são vazios (pode ocorrer com linhas de rodapé)
  return result.data.filter((row) =>
    Object.values(row).some((v) => v?.trim() !== '')
  );
}
