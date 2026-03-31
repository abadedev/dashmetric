import { z } from 'zod';

// ── Linha bruta (saída do parser CSV/XLSX) ────────────────────────────────────
// Todos os valores são strings. Validação permissiva — erros capturados depois.
export const linhaRutaSchema = z
  .record(z.string(), z.string())
  .refine((row) => Object.values(row).some((v) => v.trim() !== ''), {
    message: 'Linha completamente vazia',
  });

// ── Linha normalizada (após mapeamento de aliases) ────────────────────────────
export const linhaNormalizadaSchema = z.object({
  // Obrigatórios
  tipo: z.string().min(1, 'Campo "Tipo" é obrigatório'),

  // Opcionais
  dataAbertura: z.string().optional().default(''),

  // Opcionais
  horaAbertura: z.string().optional().default(''),
  dataFinalizacao: z.string().optional().default(''),
  horaFinalizacao: z.string().optional().default(''),
  numeroOs: z.string().optional().default(''),
  agendamento: z.string().optional().default(''),
  intervalo: z.string().optional().default(''),
  tecnico: z.string().optional().default(''),
  login: z.string().optional().default(''),
  cliente: z.string().optional().default(''),
  endereco: z.string().optional().default(''),
  bairro: z.string().optional().default(''),
  cidade: z.string().optional().default(''),
  referencia: z.string().optional().default(''),
  atendente: z.string().optional().default(''),
  indicacao: z.string().optional().default(''),
  mac: z.string().optional().default(''),
  ativo: z.string().optional().default(''),
  empresa: z.string().optional().default(''),
  dataLiberada: z.string().optional().default(''),
  observacao: z.string().optional().default(''),
  coordenadas: z.string().optional().default(''),
  plano: z.string().optional().default(''),
  telefones: z.string().optional().default(''),
});

export type LinhaNormalizada = z.infer<typeof linhaNormalizadaSchema>;

// ── Atendimento pronto para inserção ─────────────────────────────────────────
export const atendimentoInserirSchema = z.object({
  numeroOs: z.string().nullable(),
  tipo: z.string().min(1),
  motivo: z.string().nullable(),
  solucao: z.string().nullable(),
  tecnico: z.string().nullable(),
  tecnicoId: z.number().nullable(),
  cliente: z.string().nullable(),
  cidade: z.string().nullable(),
  plano: z.string().nullable(),

  dataAbertura: z.string().nullable(),
  horaAbertura: z.string().nullable(),
  dataFinalizacao: z.string().nullable(),
  horaFinalizacao: z.string().nullable(),
  aberturaAt: z.date().nullable(),
  finalizacaoAt: z.date().nullable(),

  intervalo: z.string().nullable(),
  slaHoras: z.string().nullable(),
  dentroSla: z.boolean().nullable(),
  slaCorridoSegundos: z.number().nullable(),
  slaUtilSegundos: z.number().nullable(),
  dentroSlaUtil: z.boolean().nullable(),

  login: z.string().nullable(),
  endereco: z.string().nullable(),
  bairro: z.string().nullable(),
  referencia: z.string().nullable(),
  atendente: z.string().nullable(),
  indicacao: z.string().nullable(),
  mac: z.string().nullable(),
  ativo: z.string().nullable(),
  empresa: z.string().nullable(),
  dataLiberada: z.string().nullable(),
  observacao: z.string().nullable(),
  coordenadas: z.string().nullable(),
  telefones: z.string().nullable(),
  agendamento: z.string().nullable(),

  hashImportacao: z.string().length(64),
  loteImportacaoId: z.number().nullable(),
  periodMonth: z.number().int().nullable(),
  periodYear: z.number().int().nullable(),
});

export type AtendimentoParaInserir = z.infer<typeof atendimentoInserirSchema>;

// ── Resultado de importação ───────────────────────────────────────────────────
export interface ResumoImportacao {
  totalLidas: number;
  totalValidas: number;
  totalInvalidas: number;
  totalInseridas: number;
  totalDuplicadas: number;
  erros: Array<{ linha: number; erro: string }>;
  warnings: Array<{ linha: number; aviso: string }>;
}
