import type { DashielInitialView, DashielQuickAction, DashielScreenContext } from '@/lib/dashiel/types';

const DEFAULT_INSIGHT_CARDS = [
  { label: 'Atendimentos hoje', value: '42', trend: 'up' as const },
  { label: 'SLA médio', value: '3h12', trend: 'neutral' as const },
  { label: 'Líder de volume', value: 'Reparo', trend: 'up' as const },
];

export const DASHIEL_DEFAULT_CONTEXT: DashielScreenContext = {
  periodLabel: 'Hoje',
  visibleChart: 'volume_por_tipo',
  chartTitle: 'Volume por Tipo',
  summary: {
    totalAttendances: 42,
    averageSlaHours: 3.2,
    topCategory: 'Reparo',
  },
};

export const DASHIEL_QUICK_ACTIONS: DashielQuickAction[] = [
  {
    id: 'attendances-today',
    label: 'Ver atendimentos hoje',
    prompt: 'Resuma os atendimentos de hoje e destaque os principais desvios.',
    icon: 'activity',
  },
  {
    id: 'ranking',
    label: 'Ranking de técnicos',
    prompt: 'Mostre um resumo do ranking de técnicos e quem está puxando o resultado.',
    icon: 'trophy',
  },
  {
    id: 'sla',
    label: 'Analisar SLA',
    prompt: 'Analise o SLA do período e aponte os riscos operacionais.',
    icon: 'gauge',
  },
  {
    id: 'phone-support',
    label: 'Ver suporte por telefone',
    prompt: 'Resuma o suporte por telefone e destaque categorias com maior pressão.',
    icon: 'headset',
  },
  {
    id: 'bottlenecks',
    label: 'Maiores gargalos',
    prompt: 'Quais são os maiores gargalos operacionais agora?',
    icon: 'triangle-alert',
  },
  {
    id: 'dashboard-summary',
    label: 'Resumir o dashboard',
    prompt: 'Resuma o dashboard atual em linguagem executiva.',
    icon: 'sparkles',
  },
  {
    id: 'installations',
    label: 'Ver instalações por período',
    prompt: 'Analise as instalações do período e compare com os demais atendimentos.',
    icon: 'wrench',
  },
];

function formatSlaHours(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '3h12';
  }

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function buildDashielInitialView(context?: DashielScreenContext): DashielInitialView {
  const summary = context?.summary;
  const periodLabel = context?.periodLabel || 'hoje';
  const topCategory = typeof summary?.topCategory === 'string' ? summary.topCategory : 'Reparo';
  const totalAttendances =
    typeof summary?.totalAttendances === 'number' ? summary.totalAttendances : 42;
  const averageSla = formatSlaHours(
    typeof summary?.averageSlaHours === 'number' ? summary.averageSlaHours : 3.2
  );
  const chartLabel = context?.chartTitle || 'Volume por Tipo';

  return {
    title:
      context?.visibleChart === 'volume_por_tipo'
        ? `${topCategory} lidera o volume no recorte atual`
        : `Leitura operacional pronta para ${periodLabel.toLowerCase()}`,
    description:
      context?.visibleChart === 'volume_por_tipo'
        ? `No gráfico ${chartLabel}, ${topCategory} aparece como principal frente operacional. Posso detalhar por técnico, tendência ou concentração do volume.`
        : `Eu posso analisar atendimentos, SLA, ranking técnico, instalações, suporte por telefone, vendas, cancelamentos e qualidade operacional sem sair do dashboard.`,
    insightCards: [
      {
        label: 'Atendimentos',
        value: String(totalAttendances),
        trend: 'up',
      },
      {
        label: 'SLA médio',
        value: averageSla,
        trend: 'neutral',
      },
      {
        label: 'Categoria crítica',
        value: topCategory,
        trend: 'up',
      },
    ],
    quickActions: DASHIEL_QUICK_ACTIONS,
    suggestions: [
      `Detalhar ${topCategory} por técnico`,
      'Explicar os principais gargalos',
      `Comparar SLA no período ${periodLabel}`,
    ],
  };
}

export function getInsightBadgeCount(context?: DashielScreenContext) {
  if (!context?.summary) {
    return 0;
  }

  return Object.values(context.summary).some((value) => value !== undefined && value !== null) ? 1 : 0;
}

export function getDefaultInsightCards() {
  return DEFAULT_INSIGHT_CARDS;
}
