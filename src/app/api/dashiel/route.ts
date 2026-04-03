import { NextRequest, NextResponse } from 'next/server';
import { DASHIEL_DEFAULT_CONTEXT } from '@/lib/dashiel/mock-context';
import type {
  DashielApiRequest,
  DashielInsightCard,
  DashielScreenContext,
} from '@/lib/dashiel/types';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

function formatSla(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '3h12';
  }

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

function buildContextCards(context?: DashielScreenContext): DashielInsightCard[] {
  const merged = context || DASHIEL_DEFAULT_CONTEXT;
  const summary = merged.summary || {};

  return [
    {
      label: 'Atendimentos',
      value: String(typeof summary.totalAttendances === 'number' ? summary.totalAttendances : 42),
      trend: 'up',
    },
    {
      label: 'SLA médio',
      value: formatSla(
        typeof summary.averageSlaHours === 'number' ? summary.averageSlaHours : 3.2
      ),
      trend: 'neutral',
    },
    {
      label: 'Categoria líder',
      value: typeof summary.topCategory === 'string' ? summary.topCategory : 'Reparo',
      trend: 'up',
    },
  ];
}

function detectIntent(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('sla')) return 'sla';
  if (normalized.includes('ranking') || normalized.includes('técnic') || normalized.includes('tecnic')) return 'ranking';
  if (normalized.includes('telefone') || normalized.includes('suporte')) return 'support';
  if (normalized.includes('instala')) return 'installations';
  if (normalized.includes('venda')) return 'sales';
  if (normalized.includes('cancel')) return 'cancellations';
  if (normalized.includes('qualidade')) return 'quality';
  if (normalized.includes('gargalo') || normalized.includes('desvio')) return 'bottlenecks';
  if (normalized.includes('resum') || normalized.includes('dashboard')) return 'summary';
  if (normalized.includes('atendimento') || normalized.includes('os')) return 'attendances';
  return 'default';
}

function buildAnswer(message: string, context?: DashielScreenContext) {
  const intent = detectIntent(message);
  const periodLabel = context?.periodLabel || 'recorte atual';
  const chartTitle = context?.chartTitle || 'dashboard';
  const topCategory =
    typeof context?.summary?.topCategory === 'string'
      ? context.summary.topCategory
      : DASHIEL_DEFAULT_CONTEXT.summary?.topCategory || 'Reparo';
  const totalAttendances =
    typeof context?.summary?.totalAttendances === 'number'
      ? context.summary.totalAttendances
      : DASHIEL_DEFAULT_CONTEXT.summary?.totalAttendances || 42;
  const averageSla =
    typeof context?.summary?.averageSlaHours === 'number'
      ? context.summary.averageSlaHours
      : DASHIEL_DEFAULT_CONTEXT.summary?.averageSlaHours || 3.2;

  if (intent === 'sla') {
    return {
      answer: `No período ${periodLabel}, o SLA médio está em ${formatSla(averageSla)}. A leitura mais importante é manter foco em ${topCategory}, porque esse tipo tende a concentrar volume e pressionar a meta quando há fila acumulada.\n\n- Priorize técnicos com maior backlog de ${topCategory}\n- Compare SLA útil versus volume por faixa de horário\n- Revise os casos fora da meta antes do fechamento do dia`,
      suggestions: ['Detalhar SLA por técnico', 'Mostrar gargalos por tipo', 'Comparar com o período anterior'],
    };
  }

  if (intent === 'ranking') {
    return {
      answer: `O ranking técnico está sendo puxado por quem consegue absorver ${topCategory} sem degradar o SLA. Para o período ${periodLabel}, eu usaria o ranking para separar volume bruto de eficiência operacional.\n\n- Top performers tendem a equilibrar volume e SLA útil\n- Técnicos fora da curva precisam ser comparados por mix de atividades\n- Vale cruzar ranking com reincidência e qualidade`,
      suggestions: ['Ver top 5 técnicos', 'Cruzar ranking com SLA', 'Listar técnicos com maior volume'],
    };
  }

  if (intent === 'attendances') {
    return {
      answer: `Você está com ${totalAttendances} atendimentos no ${periodLabel}. ${topCategory} lidera o volume no gráfico ${chartTitle}, então esse é o melhor ponto de partida para entender pressão operacional, alocação e risco de fila.\n\n- Posso quebrar por técnico\n- Posso destacar concentração por tipo\n- Posso resumir tendências e gargalos`,
      suggestions: ['Detalhar por técnico', 'Ver concentração por tipo', 'Apontar desvios críticos'],
    };
  }

  if (intent === 'support') {
    return {
      answer: `No suporte por telefone, eu olharia primeiro para categorias com maior recorrência e baixa conversão em resolução. Se ${topCategory} também estiver alto no dashboard, existe chance de o suporte estar antecipando ou escalando parte dessa pressão operacional.\n\n- Identifique categorias que mais abrem manutenção\n- Compare atendente versus volume sem manutenção\n- Isole chamadas que viram OS externa`,
      suggestions: ['Resumo do suporte telefônico', 'Ver categorias com maior pressão', 'Cruzar suporte com manutenção'],
    };
  }

  if (intent === 'installations') {
    return {
      answer: `As instalações devem ser lidas junto com o restante do mix operacional. Se ${topCategory} segue dominante em ${periodLabel}, a operação pode estar consumindo capacidade que normalmente sustentaria agendas de implantação.\n\n- Compare instalações com reparos no mesmo período\n- Verifique técnicos que alternam entre implantação e corretiva\n- Acompanhe fila e SLA das ordens novas`,
      suggestions: ['Comparar instalações e reparos', 'Ver instalações por técnico', 'Mapear impacto no SLA'],
    };
  }

  if (intent === 'sales') {
    return {
      answer: `Na frente comercial, eu resumiria o funil olhando negociados, fechados, pedidos instalados e cancelados. O ponto operacional é entender se a capacidade atual suporta crescimento sem piorar o SLA médio de ${formatSla(averageSla)}.\n\n- Verifique conversão por cidade ou origem\n- Compare vendas fechadas versus pedidos instalados\n- Monitore cancelamentos logo após fechamento`,
      suggestions: ['Resumir conversão comercial', 'Ver vendas por cidade', 'Cruzar vendas e instalações'],
    };
  }

  if (intent === 'cancellations') {
    return {
      answer: `Os cancelamentos precisam ser lidos como sinal de atrito operacional ou comercial. Se ${topCategory} domina o volume, vale verificar se ele também aparece antes do churn ou em regiões com maior desgaste de atendimento.\n\n- Separe motivos mais recorrentes\n- Cruze cidade com reincidência operacional\n- Identifique quedas após atrasos ou retrabalho`,
      suggestions: ['Mostrar motivos de cancelamento', 'Cruzar cancelamentos com SLA', 'Ver cidades críticas'],
    };
  }

  if (intent === 'quality') {
    return {
      answer: `Na qualidade, o mais útil é identificar se os indicadores estão concentrados nos mesmos técnicos, cidades ou tipos de OS. Quando isso coincide com ${topCategory}, geralmente há oportunidade clara de ajuste de processo ou capacitação.\n\n- Liste os indicadores mais frequentes\n- Veja concentração por técnico\n- Compare qualidade com ranking e SLA`,
      suggestions: ['Ver indicadores críticos', 'Cruzar qualidade com técnicos', 'Resumir falhas recorrentes'],
    };
  }

  if (intent === 'bottlenecks') {
    return {
      answer: `Os principais gargalos parecem estar na combinação entre volume de ${topCategory}, pressão de SLA e concentração de carga em poucos recursos. Eu começaria pelo que mais afeta fila e prazo no período ${periodLabel}.\n\n- Técnicos com excesso de volume relativo\n- Tipos de atendimento que puxam tempo médio para cima\n- Faixas do dia com maior concentração de abertura`,
      suggestions: ['Mostrar gargalos por técnico', 'Ver tipos com pior SLA', 'Resumir plano de ação'],
    };
  }

  if (intent === 'summary') {
    return {
      answer: `Resumo executivo do dashboard: ${topCategory} lidera o volume no período ${periodLabel}, o SLA médio está em ${formatSla(averageSla)} e o principal foco deveria ser equilibrar throughput com qualidade operacional.\n\n- Volume alto pede leitura por técnico e por tipo\n- SLA precisa ser acompanhado junto do mix operacional\n- Ranking e qualidade ajudam a validar capacidade real`,
      suggestions: ['Detalhar resumo por técnico', 'Ver resumo de SLA', 'Apontar oportunidades operacionais'],
    };
  }

  return {
    answer: `Estou lendo o contexto atual do dashboard para responder com foco operacional. No período ${periodLabel}, ${topCategory} está em evidência e isso costuma influenciar fila, SLA e distribuição entre técnicos.\n\n- Posso resumir atendimentos, SLA ou ranking\n- Posso detalhar o gráfico ${chartTitle}\n- Posso apontar gargalos e próximos passos`,
    suggestions: ['Resumir o dashboard', 'Analisar SLA', 'Ver ranking de técnicos'],
  };
}

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) {
    return response;
  }

  try {
    const body = (await req.json()) as DashielApiRequest;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensagem inválida.' }, { status: 400 });
    }

    const context = body.context || DASHIEL_DEFAULT_CONTEXT;
    const result = buildAnswer(message, context);

    return NextResponse.json({
      success: true,
      answer: result.answer,
      suggestions: result.suggestions,
      insightCards: buildContextCards(context),
    });
  } catch (error) {
    console.error('[dashiel]', error);
    return NextResponse.json(
      { success: false, error: 'Não foi possível gerar a análise do Dashiel.' },
      { status: 500 }
    );
  }
}
