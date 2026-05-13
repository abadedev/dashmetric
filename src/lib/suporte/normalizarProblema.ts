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
];

const COMERCIAL_KW = [
  'boleto', 'fatura', 'cobran', 'cancelar', 'mudar de plano',
  'mudança de plano', 'vencimento', 'bloqueio', 'suspensão', 'suspensao',
  'débito automático', 'debito automatico', 'extrato de conexão',
  'indicação', 'indicacao', 'titularidade', 'reativar', 'desbloqueio de confiança',
  'desbloqueio de confianca', 'retirada de equipamento', 'atendimento ruim',
  'não foi atendido', 'nao foi atendido', 'insatisfação com preço',
  'insatisfacao com preco', 'dstech play',
];

const TECNICO_KW = [
  'los', 'pon', 'pwr', 'onu', 'drop', 'roteador', 'wifi', 'wi-fi',
  'lentidão', 'lentidao', 'internet lenta', 'não conecta', 'nao conecta',
  'não navega', 'nao navega', 'conexão caindo', 'conexao caindo',
  'intermit', 'ping', 'latência', 'latencia', 'tv', 'tvbox', 'iptv',
  'troca de dados', 'rede fora', 'link fora', 'sinal', 'alcance', 'equipamento',
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
  if (modelo === 'A') {
    const r = (problemaReclamado ?? '').toLowerCase().trim();
    if (r === 'comercial') return 'Comercial';
    if (r === 'financeiro') return 'Financeiro';
    if (r.includes('suporte técnico') || r.includes('suporte tecnico')) return 'Técnico';
    return 'Outros';
  }

  const texto = `${problemaReclamado ?? ''} ${causa ?? ''}`.toLowerCase();
  if (FINANCEIRO_KW.some((k) => texto.includes(k))) return 'Financeiro';
  if (COMERCIAL_KW.some((k) => texto.includes(k))) return 'Comercial';
  if (TECNICO_KW.some((k) => texto.includes(k))) return 'Técnico';
  return 'Outros';
}
