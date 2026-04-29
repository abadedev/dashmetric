/**
 * Converte "YYYY-MM-DD" para Date no início do dia em Brasília (UTC-3 fixo).
 * Usar em todos os filtros from/to das rotas internas.
 */
export function parseDateFrom(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

/**
 * Converte "YYYY-MM-DD" para Date no fim do dia em Brasília (UTC-3 fixo).
 */
export function parseDateTo(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999-03:00`);
}
