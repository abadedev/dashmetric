import { z } from 'zod';

export const STATUS_OPTIONS = [
  { value: '0_aguardando_rede', label: '0 Aguardando rede' },
  { value: '1_tentar_contato', label: '1 Tentar contato' },
  { value: '2_tentando_contato', label: '2 Tentando contato' },
  { value: '3_direcionar_tecnico', label: '3 Direcionar técnico' },
  { value: '4_tecnico_direcionado', label: '4 Técnico direcionado' },
  { value: '5_mensagem', label: '5 Mensagem' },
  { value: '6_em_monitoramento', label: '6 Em monitoramento' },
  { value: '7_concluido', label: '7 Concluído' },
] as const;

export const PROBLEMA_OPTIONS = [
  'Somente Cliente', 'CA', 'OLT', 'CD', 'GPON', 'REDE',
] as const;

export const SENSOR_OPTIONS = [
  'Zabbix', 'Suporte', 'Radius', 'Mon_OLT',
] as const;

export const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  '0_aguardando_rede': { label: '0 Aguardando rede', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dotClass: 'bg-slate-400' },
  '1_tentar_contato': { label: '1 Tentar contato', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dotClass: 'bg-yellow-400' },
  '2_tentando_contato': { label: '2 Tentando contato', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dotClass: 'bg-orange-400' },
  '3_direcionar_tecnico': { label: '3 Direcionar técnico', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dotClass: 'bg-blue-400' },
  '4_tecnico_direcionado': { label: '4 Técnico direcionado', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dotClass: 'bg-purple-400' },
  '5_mensagem': { label: '5 Mensagem', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', dotClass: 'bg-cyan-400' },
  '6_em_monitoramento': { label: '6 Em monitoramento', className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', dotClass: 'bg-indigo-400' },
  '7_concluido': { label: '7 Concluído', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-400' },
};

export const ACTIVE_STATUSES = [
  '0_aguardando_rede',
  '1_tentar_contato',
  '2_tentando_contato',
  '3_direcionar_tecnico',
  '4_tecnico_direcionado',
  '5_mensagem',
  '6_em_monitoramento',
] as const;

export const CONCLUDED_STATUS = '7_concluido';

export const CITY_OPTIONS = [
  'Alcobaça',
  'Aparaju',
  'Barra de Caravelas',
  'Bela Vista - Nova Viçosa',
  'Canta Galo - Alcobaça',
  'Caravelas',
  'Caxanga',
  'Cumuruxatiba - Prado',
  'Duque de Caxias - Teixeira de Freitas',
  'Guarani - Prado',
  'Guaratiba - Prado',
  'Itabatã - Mucuri',
  'Itamaraju',
  'Juerana - Caravelas',
  'Ponta de Areia - Caravelas',
  'Posto da Mata - Nova Viçosa',
  'Prado',
  'Rancho Alegre - Caravelas',
  'Santo Antonio - Teixeira de Freitas',
  'São José - Alcobaça',
  'Taquari - Alcobaça',
  'Teixeira de Freitas',
] as const;

export const monitoramentoPayloadSchema = z.object({
  dataPostagem: z.string().min(1, 'Data de postagem é obrigatória.'),
  areaCity: z.string().trim().max(100).nullable().optional(),
  cliente: z.string().trim().nullable().optional(),
  login: z.string().trim().max(50).nullable().optional(),
  rede: z.string().trim().max(100).nullable().optional(),
  serialMac: z.string().trim().max(100).nullable().optional(),
  problema: z.enum(PROBLEMA_OPTIONS).nullable().optional(),
  qtdDesconexao: z.coerce.number().int().min(0).nullable().optional(),
  observacoes: z.string().trim().nullable().optional(),
  solucao: z.string().trim().nullable().optional(),
  dataSolucao: z.string().trim().nullable().optional(),
  atendAberto: z.boolean().optional(),
  sensor: z.enum(SENSOR_OPTIONS).nullable().optional(),
  status: z.enum(STATUS_OPTIONS.map((item) => item.value) as [string, ...string[]]).optional(),
});

export function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeMultilineText(value: string | null | undefined) {
  const normalized = value
    ?.replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
  return normalized ? normalized : null;
}
