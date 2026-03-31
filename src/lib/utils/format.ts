import { formatSLATime } from '@/lib/services/sla-engine';

/**
 * Formata percentual (0.95 → "95,0%")
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Formata número com separador de milhar (7500 → "7.500")
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export { formatSLATime };
