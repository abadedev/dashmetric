/**
 * Aceita "YYYY-MM-DD" ou um ISO completo e usa apenas a parte de calendario.
 */
function getDatePart(dateStr: string, functionName: string): string {
  const datePart = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!datePart) {
    throw new Error(`${functionName}: formato inválido "${dateStr}"`);
  }
  return datePart;
}

/**
 * Converte "YYYY-MM-DD" para Date no início do dia em Brasília (UTC-3).
 * 00:00 BRT = 03:00 UTC
 */
export function parseDateFrom(dateStr: string): Date {
  const datePart = getDatePart(dateStr, 'parseDateFrom');
  const [year, month, day] = datePart.split('-').map(Number);
  // 00:00:00 BRT = 03:00:00 UTC
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

/**
 * Converte "YYYY-MM-DD" para Date no fim do dia em Brasília (UTC-3).
 * 23:59:59.999 BRT = 02:59:59.999 UTC do dia seguinte
 */
export function parseDateTo(dateStr: string): Date {
  const datePart = getDatePart(dateStr, 'parseDateTo');
  const [year, month, day] = datePart.split('-').map(Number);
  // 23:59:59.999 BRT = dia seguinte às 02:59:59.999 UTC
  return new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
}
