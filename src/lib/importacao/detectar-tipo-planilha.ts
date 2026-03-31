import { normalizeHeader } from './helpers';

export type TipoPlanilha = 'atendimentos' | 'qualidade' | 'suporte';

/**
 * Detecta automaticamente o tipo de planilha analisando os headers normalizados.
 *
 * Regras (em ordem de prioridade):
 * - qualidade  → contém "indicador"
 * - suporte    → contém "atendente" OU "abertura_manut" OU "manut_ext" OU "sem_manut"
 * - atendimentos → caso padrão (contém "tipo" ou "datapedido" ou "data_abertura")
 */
export function detectarTipoPlanilha(headers: string[]): TipoPlanilha {
  const norm = headers.map(normalizeHeader);

  const has = (keyword: string) => norm.some((h) => h.includes(keyword));

  if (has('indicador')) return 'qualidade';

  if (
    has('abertura_manut') ||
    has('manut_ext') ||
    has('sem_manut') ||
    has('percentual') ||
    (has('atendente') && !has('tipo') && !has('datapedido') && !has('data_abertura'))
  ) {
    return 'suporte';
  }

  return 'atendimentos';
}
