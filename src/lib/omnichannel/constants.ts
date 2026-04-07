/**
 * Agentes não-humanos do módulo Omnichannel.
 *
 * Estes agentes:
 *   - SÃO contabilizados no card "Total de Atendimentos"
 *   - NÃO aparecem em nenhum card de desempenho (TMA, TME, Atendentes)
 *   - NÃO aparecem em nenhum gráfico ou ranking
 *   - APARECEM apenas na Tabela Analítica
 *
 * Valores em forma normalizada: lowercase, sem acentos, sem espaços —
 * mesmo padrão usado em isHumanAgent() no importador.
 */
export const AGENTES_EXCLUIDOS = new Set([
  'robo',
  'sematendente',
  'bot',
  'automatico',
]);
