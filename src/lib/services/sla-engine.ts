// Motor de cálculo de SLA — regras de negócio do sistema DSTECH NOC
// Seg-Sex 08:00-18:00 | Sáb 08:00-12:00 | Dom/feriados = sem expediente

/**
 * SLA Corrido: tempo total da abertura ao fechamento (segundos)
 */
export function calculateSLACorrido(openedAt: Date, closedAt: Date): number {
  return Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000);
}

/**
 * SLA Útil: soma apenas dos segundos dentro do expediente
 * Regra: abertura fora do expediente → SLA inicia no próximo período útil
 *        fechamento fora do expediente → SLA encerra no momento exato
 */
export function calculateSLAUtil(
  openedAt: Date,
  closedAt: Date,
  holidays: Date[]
): number {
  const holidaySet = new Set(
    holidays.map((h) => h.toISOString().split('T')[0])
  );

  let totalSeconds = 0;
  let cursor = new Date(openedAt);

  while (cursor < closedAt) {
    const dayOfWeek = cursor.getDay(); // 0=Dom, 6=Sáb
    const dateStr = cursor.toISOString().split('T')[0];
    const isHoliday = holidaySet.has(dateStr);

    let dayStart: number | null = null;
    let dayEnd: number | null = null;

    if (!isHoliday) {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Seg-Sex: 08:00-18:00
        dayStart = 8 * 3600;
        dayEnd = 18 * 3600;
      } else if (dayOfWeek === 6) {
        // Sábado: 08:00-12:00
        dayStart = 8 * 3600;
        dayEnd = 12 * 3600;
      }
      // Domingo → null (sem expediente)
    }

    if (dayStart !== null && dayEnd !== null) {
      const dayBase = new Date(cursor);
      dayBase.setHours(0, 0, 0, 0);

      const cursorSecondsOfDay =
        (cursor.getTime() - dayBase.getTime()) / 1000;

      // Para o dia do fechamento, limitar até closedAt
      const closedDayBase = new Date(closedAt);
      closedDayBase.setHours(0, 0, 0, 0);
      const isClosingDay =
        cursor.toDateString() === closedAt.toDateString();

      const closedSecondsOfDay = isClosingDay
        ? (closedAt.getTime() - dayBase.getTime()) / 1000
        : 24 * 3600; // usa o fim do expediente como limite

      const effectiveStart = Math.max(cursorSecondsOfDay, dayStart);
      const effectiveEnd = Math.min(closedSecondsOfDay, dayEnd);

      if (effectiveEnd > effectiveStart) {
        totalSeconds += effectiveEnd - effectiveStart;
      }
    }

    // Avançar para o início do próximo dia
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return Math.floor(totalSeconds);
}

/**
 * Verifica se o SLA foi cumprido
 */
export function isWithinSLA(
  slaSeconds: number,
  targetHours: number | null
): boolean | null {
  if (targetHours === null) return null;
  return slaSeconds <= targetHours * 3600;
}

/**
 * Formata segundos para HH:MM:SS
 */
export function formatSLATime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Busca as metas SLA por tipo de atividade
 */
export const SLA_TARGETS: Record<string, number | null> = {
  instalacao_nova: 30,
  instalacao_reativacao: 30,
  reparo: 24,
  mudanca_endereco: 30,
  mudanca_plano: 24,
  retirada_kit: null,
  retorno: null,
};

export const ACTIVITY_TYPE_MAP: Record<string, string> = {
  // Formato legado (planilhas antigas)
  'Instalação (Nova)': 'instalacao_nova',
  'Instalação (Reativação)': 'instalacao_reativacao',
  Reparo: 'reparo',
  'Mudança de Endereço': 'mudanca_endereco',
  'Retirada de Kit': 'retirada_kit',
  'Mudança de Plano': 'mudanca_plano',
  Retorno: 'retorno',
  'Cancelado - Reparo': 'cancelado_reparo',
  'Cancelado - Retirada de Kit': 'cancelado_retirada_kit',
  'Cancelado - Mudança de Endereço': 'cancelado_mudanca_endereco',
  'Cancelado - Retorno': 'cancelado_retorno',
  'Cancelado - Reativação de Login': 'cancelado_reativacao_login',
  // Formato do sistema (CSV exportado diretamente)
  Nova: 'instalacao_nova',
  Reativacao: 'instalacao_reativacao',
  Reativação: 'instalacao_reativacao',
  Manutencao: 'reparo',
  Manutenção: 'reparo',
  'Mudanca de Endereco': 'mudanca_endereco',
  'Retirada Kit': 'retirada_kit',
  'Mudanca de Plano': 'mudanca_plano',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  instalacao_nova: 'Instalação Nova',
  instalacao_reativacao: 'Instalação Reativação',
  reparo: 'Reparo',
  mudanca_endereco: 'Mudança de Endereço',
  retirada_kit: 'Retirada de Kit',
  mudanca_plano: 'Mudança de Plano',
  retorno: 'Retorno',
  cancelado_reparo: 'Cancelado - Reparo',
  cancelado_retirada_kit: 'Cancelado - Retirada de Kit',
  cancelado_mudanca_endereco: 'Cancelado - Mudança de Endereço',
  cancelado_retorno: 'Cancelado - Retorno',
  cancelado_reativacao_login: 'Cancelado - Reativação de Login',
};
