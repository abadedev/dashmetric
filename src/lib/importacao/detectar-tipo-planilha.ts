import { normalizeHeader } from './helpers';

export type TipoPlanilha =
  | 'atendimentos'
  | 'qualidade'
  | 'suporte'
  | 'vendas'
  | 'cancelamentos'
  | 'infraestrutura'
  | 'canceladas_mudanca_plano'
  | 'inviabilidade_ict';

/**
 * Detecta automaticamente o tipo de planilha analisando os headers normalizados.
 *
 * Regras (em ordem de prioridade):
 * - qualidade  → contém "indicador"
 * - suporte    → contém "atendente" OU "abertura_manut" OU "manut_ext" OU "sem_manut"
 * - vendas      → cabeçalhos comerciais (cliente/cidade/indicacao, datapedido/datainstalacao etc.)
 * - atendimentos → caso padrão
 */
export function detectarTipoPlanilha(headers: string[], nomeArquivo?: string): TipoPlanilha {
  const normalizedHeaders = headers.map(normalizeHeader);
  const nomeArquivoNorm = (nomeArquivo ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const has = (keyword: string) =>
    normalizedHeaders.some((header) => header.includes(normalizeHeader(keyword)));
  const hasAll = (...keywords: string[]) => keywords.every((keyword) => has(keyword));

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

  if (
    hasAll('titulo', 'categoria') ||
    hasAll('title', 'category') ||
    hasAll('categoria', 'cidade', 'referencia')
  ) {
    return 'infraestrutura';
  }

  if (
    !has('tipo') &&
    (hasAll('cidade', 'motivo') ||
      hasAll('cidade', 'motivo_cancelamento') ||
      hasAll('cidade', 'data_cancelamento') ||
      hasAll('cidade', 'datacancelamento') ||
      hasAll('cliente', 'cidade', 'motivo'))
  ) {
    return 'cancelamentos';
  }

  // Planilha de inviabilidade técnica ICT da DSTech
  // Identificada por ter "inviabilidade" + "instalador" + "datapedido"
  if (has('inviabilidade') && has('instalador') && has('datapedido')) {
    return 'inviabilidade_ict';
  }

  if (
    !has('tipo') &&
    !has('instalador') &&
    (
      hasAll('cliente', 'cidade', 'indicacao') ||
      hasAll('datapedido', 'cidade', 'indicacao') ||
      hasAll('datapedido', 'datainstalacao', 'cidade')
    )
  ) {
    return 'vendas';
  }

  // Planilha de manutenções canceladas da DSTech — identificada pelo nome do arquivo
  if (
    nomeArquivoNorm.includes('cancelad') &&
    has('os') &&
    has('motivo') &&
    has('causa') &&
    has('solucao')
  ) {
    return 'canceladas_mudanca_plano';
  }

  return 'atendimentos';
}
