import { z } from 'zod';
import type { ServiceListing } from '@/lib/db/infra-schema';

export const INFRA_OCCURRENCE_OPTIONS = [
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
});

export function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
  'id' | 'cityArea' | 'address' | 'locationUrl' | 'networkBox' | 'tipoOcorrencia' | 'observacaoInfra' | 'referenceDate'
>) {
  return [
    '🚨 OS PARA MANUTENÇÃO',
    '',
    `Cidade: ${normalizeNullableText(record.cityArea) ?? '-'}`,
    `Endereço: ${normalizeNullableText(record.address) ?? '-'}`,
    `Localização: ${getBestLocation(record)}`,
    `Caixa / Rede: ${normalizeNullableText(record.networkBox) ?? '-'}`,
    '',
    `Ocorrência: ${record.tipoOcorrencia}`,
    `Observação: ${normalizeNullableText(record.observacaoInfra) ?? '-'}`,
    '',
    `OS: #${record.id}`,
    `Data: ${formatDisplayDate(record.referenceDate)}`,
  ].join('\n');
}
