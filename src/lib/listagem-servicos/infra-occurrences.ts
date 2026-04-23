import { z } from 'zod';
import type { ServiceListing } from '@/lib/db/infra-schema';

export const INFRA_OCCURRENCE_OPTIONS = [
  'CA com Abelhas | Marimbondos',
  'CA com formigas',
  'Extensão de rede necessária',
  'CA com tampa solta',
  'CA danificada',
  'CA dependurada',
  'CA sem plotagem',
  'Sinal fora dos padrões',
  'CA sem sinal',
  'Splitter 1x16 (futuras instalações)',
  'Splitter 1x16 (todas portas ocupadas)',
  'Splitter 1x16 (cliente aguardando)',
  'Faltando acoplador',
  'Retorno fora dos padrões',
  'Sinais invertidos',
  'Drop rompido',
  'Troca de poste',
  'Cabo cortado',
  'Clientes desconectados',
  'Porta do splitter com defeito',
  'Drop baixo',
] as const;

export type InfraOccurrenceType = (typeof INFRA_OCCURRENCE_OPTIONS)[number];

export const infraOccurrenceSchema = z.enum(INFRA_OCCURRENCE_OPTIONS, {
  error: 'Selecione um tipo de ocorrência válido.',
});

export const serviceListingPayloadSchema = z.object({
  referenceDate: z.string().min(1, 'Data de referência é obrigatória.'),
  priority: z.string().trim().max(10).nullable().optional(),
  technology: z.string().trim().max(10).nullable().optional(),
  cityArea: z.string().trim().max(150).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  locationUrl: z.string().trim().nullable().optional(),
  networkBox: z.string().trim().max(255).nullable().optional(),
  problem: z.string().trim().nullable().optional(),
  tipoOcorrencia: infraOccurrenceSchema,
  observacaoInfra: z.string().trim().nullable().optional(),
  status: z.string().trim().max(50).optional(),
  occurrenceCreated: z.boolean().optional(),
  technician: z.string().trim().max(255).nullable().optional(),
  solution: z.string().trim().nullable().optional(),
  resolutionDate: z.string().trim().nullable().optional(),
  resolutionNotes: z.string().trim().nullable().optional(),
  fotoUrl: z.string().trim().nullable().optional(),
  solicitante: z.string().trim().max(255).nullable().optional(),
});

export function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Mapa de aliases de cidades.
 * Chave: valor normalizado (lowercase, sem acento).
 * Valor: nome canônico (lowercase, sem acento) para armazenar.
 */
export const CITY_ALIASES: Record<string, string> = {
  'po to da mata': 'posto da mata',
  'posto da matta': 'posto da mata',
  'taquari - alcobaca': 'taquari',
  'ao jo e': 'sao jose',
  'ao jose': 'sao jose',
  'ao jo': 'sao jose',
};

/**
 * Normaliza o nome da cidade para a chave canônica armazenada no banco.
 * - trim + colapso de múltiplos espaços → 1 espaço
 * - lowercase + remoção de acentos
 * - aplica aliases de cidades conhecidas
 * Para exibição no gráfico/UI, use .toUpperCase() sobre o valor retornado.
 */
export function normalizeCityArea(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // trim, colapso de espaços, lowercase
  let normalized = raw.trim().replace(/\s+/g, ' ').toLowerCase();

  // Remove acentos
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Aplica mapa de aliases
  const canonical = CITY_ALIASES[normalized] ?? normalized;
  return canonical || null;
}

function formatPriorityLabel(value: string | null | undefined) {
  const priority = normalizeNullableText(value);

  if (priority === '1') return '1 (Alta)';
  if (priority === '2') return '2 (Média)';
  if (priority === '-') return '- (Baixa)';

  return priority ?? '-';
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getBestLocation(record: Pick<ServiceListing, 'locationUrl' | 'address' | 'cityArea' | 'networkBox'>) {
  return (
    normalizeNullableText(record.locationUrl) ??
    normalizeNullableText(record.address) ??
    normalizeNullableText(record.cityArea) ??
    normalizeNullableText(record.networkBox) ??
    '-'
  );
}

export function buildInfraDispatchMessage(record: Pick<
  ServiceListing,
  'id' | 'priority' | 'cityArea' | 'address' | 'locationUrl' | 'networkBox' | 'tipoOcorrencia' | 'observacaoInfra' | 'referenceDate' | 'fotoUrl'
>) {
  const observacao = normalizeNullableText(record.observacaoInfra);

  return [
    '🚨 OS PARA MANUTENÇÃO',
    `OS: #${record.id}`,
    `Prioridade: ${formatPriorityLabel(record.priority)}`,
    `Data: ${formatDisplayDate(record.referenceDate)}`,
    `Caixa / Rede: ${normalizeNullableText(record.networkBox) ?? '-'}`,
    `Cidade: ${normalizeNullableText(record.cityArea) ?? '-'}`,
    `Endereço: ${normalizeNullableText(record.address) ?? '-'}`,
    `Localização: ${getBestLocation(record)}`,
    `Ocorrência: ${record.tipoOcorrencia}`,
    observacao ? `Observação: ${observacao}` : null,
    record.fotoUrl ? `📷 Foto: ${record.fotoUrl}` : null,
  ].filter(Boolean).join('\n');
}
