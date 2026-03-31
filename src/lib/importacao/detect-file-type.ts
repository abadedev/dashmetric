export type TipoArquivo = 'csv' | 'xlsx';

/**
 * Detecta o tipo do arquivo pela extensão e, como fallback,
 * pelos magic bytes (XLSX começa com PK: 0x50 0x4B).
 */
export function detectFileType(filename: string, buffer?: Buffer): TipoArquivo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'csv') return 'csv';

  // Fallback: XLSX/ZIP magic bytes
  if (buffer && buffer[0] === 0x50 && buffer[1] === 0x4b) return 'xlsx';

  return 'csv';
}
