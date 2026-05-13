/**
 * Cálculo de SLA da Listagem de Serviços com base em metas configuráveis
 * por prioridade (horas corridas).
 */

export type SlaStatus = 'within' | 'warning' | 'breached' | 'unknown';

export interface SlaMeta {
  prioridade: number;
  label: string;
  metaHoras: number;
}

const WARNING_THRESHOLD = 0.8;

/** Mapeia o valor de prioridade (string/number) para 1, 2 ou 3. Retorna null se inválido. */
export function parsePriority(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function getMetaForPriority(metas: SlaMeta[], prioridade: number | null): SlaMeta | null {
  if (prioridade === null) return null;
  return metas.find((m) => m.prioridade === prioridade) ?? null;
}

/** Horas decorridas entre duas datas (corridas, com duas casas decimais). */
export function hoursBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, diff / 3_600_000);
}

export interface ComputeSlaInput {
  openedAt: Date;
  resolvedAt: Date | null;
  prioridade: number | null;
  metas: SlaMeta[];
  now?: Date;
}

export interface SlaEvaluation {
  status: SlaStatus;
  hoursElapsed: number;
  metaHoras: number | null;
  /** Razão tempo/meta (0..∞). */
  ratio: number;
}

export function evaluateSla({
  openedAt,
  resolvedAt,
  prioridade,
  metas,
  now = new Date(),
}: ComputeSlaInput): SlaEvaluation {
  const meta = getMetaForPriority(metas, prioridade);
  const reference = resolvedAt ?? now;
  const hoursElapsed = hoursBetween(openedAt, reference);

  if (!meta) {
    return { status: 'unknown', hoursElapsed, metaHoras: null, ratio: 0 };
  }

  const ratio = hoursElapsed / meta.metaHoras;
  let status: SlaStatus;
  if (ratio > 1) status = 'breached';
  else if (ratio >= WARNING_THRESHOLD) status = 'warning';
  else status = 'within';

  return { status, hoursElapsed, metaHoras: meta.metaHoras, ratio };
}

/** Formata horas decorridas como "Nh" inteiro, sem arredondar pra cima. */
export function formatHoursLabel(h: number): string {
  if (h < 1) {
    const mins = Math.floor(h * 60);
    return `${mins}min`;
  }
  return `${Math.floor(h)}h`;
}
