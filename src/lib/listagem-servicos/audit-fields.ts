export const AUDITED_FIELDS = [
  'status',
  'technician',
  'tipoOcorrencia',
  'priority',
  'solution',
  'resolutionNotes',
  'observacaoInfra',
] as const;

export type AuditedField = (typeof AUDITED_FIELDS)[number];

export const FIELD_LABELS: Record<AuditedField, string> = {
  status: 'Status',
  technician: 'Técnico',
  tipoOcorrencia: 'Tipo de ocorrência',
  priority: 'Prioridade',
  solution: 'Solução',
  resolutionNotes: 'Notas de resolução',
  observacaoInfra: 'Observação',
};

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  tecnico_direcionado: 'Técnico direcionado',
  em_monitoramento: 'Em monitoramento',
  resolvido: 'Resolvido',
  nao_resolvido: 'Não resolvido',
};

export function formatAuditValue(field: AuditedField, value: string | null): string {
  if (value === null || value === '') return '—';
  if (field === 'status') return STATUS_LABELS[value] ?? value;
  return value;
}

export function normalizeForCompare(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return String(value);
}
