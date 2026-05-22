export type Segmento = 'Técnico' | 'Comercial' | 'Financeiro' | 'Outros';
export type ModeloPeriodo = 'A' | 'B';

/**
 * Detecta o modelo de preenchimento baseado na data de abertura do atendimento.
 *
 * - Modelo A: a partir de maio/2026 — ProblemaReclamado é um de 3 valores fixos
 *   ("Suporte Técnico", "Comercial", "Financeiro").
 * - Modelo B: jan–abr/2026 e qualquer período anterior — texto livre detalhado.
 */
export function detectarModelo(dataAbertura: Date | string): ModeloPeriodo {
  const d = dataAbertura instanceof Date ? dataAbertura : new Date(dataAbertura);
  if (isNaN(d.getTime())) return 'B';
  if (d.getFullYear() === 2026 && d.getMonth() + 1 >= 5) return 'A';
  if (d.getFullYear() > 2026) return 'A';
  return 'B';
}

const FINANCEIRO_KW = [
  'status 6', 'status 4', 'status 5', 'status 2', 'bloqueado',
  'aviso de bloqueio', 'pendência financeira', 'pendencia financeira',
  'débitos em aberto', 'debitos em aberto', 'inadimplên', 'inadimplenc',
  'financeiro',
  'boleto', 'fatura', 'vencimento', 'cobrança', 'cobranca',
];

const COMERCIAL_KW = [
  'cobran', 'cancelar', 'mudar de plano',
  'mudança de plano', 'bloqueio', 'suspensão', 'suspensao',
  'débito automático', 'debito automatico', 'extrato de conexão',
  'indicação', 'indicacao', 'titularidade', 'reativar', 'desbloqueio de confiança',
  'desbloqueio de confianca', 'retirada de equipamento', 'atendimento ruim',
  'não foi atendido', 'nao foi atendido', 'insatisfação com preço',
  'insatisfacao com preco', 'dstech play',
  'mudança de endereço', 'mudanca de endereco', 'mudanca de plano',
  'cancelamento', 'reativação', 'reativacao', 'troca de plano',
  'desbloqueio',
];

const TECNICO_KW = [
  'los', 'pon', 'pwr', 'onu', 'drop', 'roteador', 'wifi', 'wi-fi',
  'lentidão', 'lentidao', 'internet lenta', 'não conecta', 'nao conecta',
  'não navega', 'nao navega', 'conexão caindo', 'conexao caindo',
  'intermit', 'ping', 'latência', 'latencia', 'tv', 'tvbox', 'iptv',
  'troca de dados', 'rede fora', 'link fora', 'sinal', 'alcance', 'equipamento',
  'sem sinal', 'intermitência', 'intermitencia', 'sem internet', 'ip travado',
];

/**
 * Calcula o segmento (Técnico/Comercial/Financeiro/Outros) a partir dos campos
 * brutos do CSV, aplicando regras diferentes conforme o modelo do período.
 */
export function calcularSegmento(
  problemaReclamado: string,
  causa: string,
  modelo: ModeloPeriodo
): Segmento {
  const pr = (problemaReclamado ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (pr.startsWith('comercial')) return 'Comercial';
  if (pr.startsWith('financeiro')) return 'Financeiro';
  if (pr.startsWith('boleto')) return 'Financeiro';
  if (pr.startsWith('suporte')) return 'Técnico';

  const texto = `${problemaReclamado ?? ''} ${causa ?? ''}`.toLowerCase();
  if (FINANCEIRO_KW.some((k) => texto.includes(k))) return 'Financeiro';
  if (COMERCIAL_KW.some((k) => texto.includes(k))) return 'Comercial';
  if (TECNICO_KW.some((k) => texto.includes(k))) return 'Técnico';
  return 'Outros';
}
