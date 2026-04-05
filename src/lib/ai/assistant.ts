import { getCancellationsAnalytics } from '@/lib/services/analytics/cancellations-analytics';
import { getPhoneSupportAnalytics } from '@/lib/services/analytics/phone-support-analytics';
import { getRankingAnalytics } from '@/lib/services/analytics/ranking-analytics';
import { getSalesAnalytics } from '@/lib/services/analytics/sales-analytics';
import { getSummaryAnalytics } from '@/lib/services/analytics/summary-analytics';
import { getSlaAnalytics } from '@/lib/services/analytics/attendance-analytics';
import type { ExternalApiFilters } from '@/lib/api/filters';

export type AssistantInsightCard = {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
};

export type AssistantReply = {
  answer: string;
  suggestions: string[];
  insightCards: AssistantInsightCard[];
};

type AssistantIntent =
  | 'sla'
  | 'ranking'
  | 'support'
  | 'sales'
  | 'cancellations'
  | 'summary'
  | 'default';

function detectIntent(message: string): AssistantIntent {
  const normalized = message.toLowerCase();

  if (normalized.includes('sla')) return 'sla';
  if (normalized.includes('ranking') || normalized.includes('tecnic') || normalized.includes('técnic')) {
    return 'ranking';
  }
  if (normalized.includes('suporte') || normalized.includes('telefone')) return 'support';
  if (normalized.includes('venda') || normalized.includes('comercial')) return 'sales';
  if (normalized.includes('cancel')) return 'cancellations';
  if (normalized.includes('resum') || normalized.includes('dashboard') || normalized.includes('geral')) {
    return 'summary';
  }
  return 'default';
}

function getDefaultFilters(): ExternalApiFilters {
  return {
    workspaceSlug: null,
    workspaceId: null,
    startDate: null,
    endDate: null,
    period: 'current_month',
    technicianId: null,
    attendantId: null,
    type: null,
    category: null,
    status: null,
    groupBy: 'day',
    limit: 10,
    page: 1,
    offset: 0,
    city: null,
    plan: null,
    bairro: null,
    source: null,
    search: null,
    resource: null,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildInsightCards(input: {
  totalAttendances: number;
  slaUtilPercent: number;
  topCategory: string;
}): AssistantInsightCard[] {
  return [
    {
      label: 'Atendimentos',
      value: String(input.totalAttendances),
      trend: input.totalAttendances > 0 ? 'up' : 'neutral',
    },
    {
      label: 'SLA útil',
      value: formatPercent(input.slaUtilPercent),
      trend: input.slaUtilPercent >= 0.9 ? 'up' : 'down',
    },
    {
      label: 'Maior volume',
      value: input.topCategory || 'Sem dados',
      trend: 'neutral',
    },
  ];
}

export async function buildAssistantReply(message: string): Promise<AssistantReply> {
  const filters = getDefaultFilters();
  const intent = detectIntent(message);

  const summary = await getSummaryAnalytics(filters);
  const sla = await getSlaAnalytics(filters);

  const topCategory =
    sla.byType
      .slice()
      .sort((left, right) => right.total - left.total)[0]?.activityType ?? 'Sem dados';

  const insightCards = buildInsightCards({
    totalAttendances: summary.totals.attendances,
    slaUtilPercent: sla.totals.avgSlaUtilPercent,
    topCategory,
  });

  if (intent === 'sla') {
    const worstType = sla.byType
      .slice()
      .sort((left, right) => left.slaUtilPercent - right.slaUtilPercent)[0];

    return {
      answer: [
        `No período atual, o SLA útil geral está em ${formatPercent(sla.totals.avgSlaUtilPercent)} com ${sla.totals.concluded} ordens concluídas.`,
        worstType
          ? `O tipo com maior pressão é ${worstType.activityType}, com ${formatPercent(worstType.slaUtilPercent)} dentro do SLA e ${worstType.total} registros no recorte.`
          : 'Ainda não encontrei volume suficiente para destacar um tipo crítico.',
        'Se você quiser, eu posso detalhar os tipos com pior desempenho ou resumir os principais gargalos operacionais.',
      ].join(' '),
      suggestions: ['Mostrar tipos com pior SLA', 'Ver comparativo por atividade', 'Resumir gargalos'],
      insightCards,
    };
  }

  if (intent === 'ranking') {
    const ranking = await getRankingAnalytics(filters);
    const leader = ranking.technicians[0];

    return {
      answer: leader
        ? [
            `No ranking atual, ${leader.technicianName} lidera com ${leader.totalOS} OS e ${leader.slaUtilPercent ?? 0}% de SLA útil.`,
            `Ao mesmo tempo, o volume geral continua concentrado em ${topCategory}, então vale cruzar produção com mix operacional para evitar leitura injusta do desempenho.`,
            'Posso listar o top 5 completo ou destacar quem tem alto volume com SLA abaixo do esperado.',
          ].join(' ')
        : 'Ainda não encontrei dados suficientes para montar o ranking técnico no workspace atual.',
      suggestions: ['Ver top 5 técnicos', 'Cruzar ranking com SLA', 'Apontar baixa performance'],
      insightCards,
    };
  }

  if (intent === 'support') {
    const support = await getPhoneSupportAnalytics(filters);
    const topCategoryRow = support.byCategory[0];

    return {
      answer: [
        `No suporte telefônico, foram identificados ${support.totals.totalSupports} atendimentos no período atual.`,
        topCategoryRow
          ? `A categoria mais recorrente é ${topCategoryRow.category}, com ${topCategoryRow.total} ocorrências (${topCategoryRow.sharePercent}% do total).`
          : 'Ainda não há categorias suficientes para destacar uma recorrência.',
        'Se quiser, eu posso abrir isso por atendente ou mostrar onde o suporte está virando manutenção externa.',
      ].join(' '),
      suggestions: ['Ver categorias críticas', 'Listar por atendente', 'Cruzar com manutenção externa'],
      insightCards,
    };
  }

  if (intent === 'sales') {
    const sales = await getSalesAnalytics(filters);
    const topCity = sales.byCity[0];

    return {
      answer: [
        `Na frente comercial, o período atual soma ${sales.totals.negotiatedClients} clientes negociados, ${sales.totals.closedClients} fechados e ${sales.totals.installedOrders} instalações concluídas.`,
        topCity ? `A cidade com maior presença é ${topCity.city}, com ${topCity.total} registros.` : 'Ainda não há uma cidade líder clara no recorte atual.',
        'Posso detalhar conversão, origem ou o impacto operacional entre vendas e instalações.',
      ].join(' '),
      suggestions: ['Ver conversão comercial', 'Mostrar vendas por cidade', 'Cruzar vendas e instalações'],
      insightCards,
    };
  }

  if (intent === 'cancellations') {
    const cancellations = await getCancellationsAnalytics(filters);
    const topReason = cancellations.byReason[0];

    return {
      answer: [
        `No período atual, há ${cancellations.totals.cancelledClients} cancelamentos registrados.`,
        topReason
          ? `O motivo mais recorrente é ${topReason.reason}, com ${topReason.total} casos.`
          : 'Ainda não há motivo dominante o bastante para destacar no recorte atual.',
        'Se você quiser, eu posso abrir isso por cidade ou relacionar cancelamentos com a pressão operacional.',
      ].join(' '),
      suggestions: ['Ver motivos principais', 'Mostrar cancelamentos por cidade', 'Cruzar com operação'],
      insightCards,
    };
  }

  return {
    answer: [
      `Resumo atual do workspace: ${summary.totals.attendances} atendimentos, ${summary.totals.phoneSupports} contatos de suporte, ${summary.totals.qualityRecords} registros de qualidade e SLA útil médio em ${formatPercent(sla.totals.avgSlaUtilPercent)}.`,
      `Hoje, ${topCategory} é o tipo com maior volume.`,
      'Posso responder com foco em SLA, ranking, suporte, vendas ou cancelamentos usando os dados reais já carregados no banco.',
    ].join(' '),
    suggestions: ['Resumir SLA', 'Ver ranking técnico', 'Mostrar suporte', 'Analisar vendas'],
    insightCards,
  };
}
