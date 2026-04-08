import { db } from '@/lib/db';
import { salesReferralRecords, type SalesReferralStatus } from '@/lib/db/schema';
import { normalizeHeader, parseBRDateWithTime, splitBRDateTime, trimOrNull } from './helpers';

const REFERRAL_ALIASES = {
  cadastro: ['cadastro'],
  indicante: ['indicante'],
  indicado: ['indicado'],
  contratado: ['contratado'],
  telefoneIndicado: ['tel_indicado', 'telefone_indicado', 'telefone do indicado'],
  cidade: ['cidade'],
  status: ['status'],
};

const STATUS_MAP: Array<{ match: string[]; value: SalesReferralStatus }> = [
  { match: ['contratado', 'contratou', 'aprovado', 'fechado'], value: 'contratado' },
  { match: ['pendente', 'aguardando', 'em analise', 'analise'], value: 'pendente' },
  { match: ['reprovado', 'nao contratou', 'não contratou', 'duplicado', 'cancelado'], value: 'reprovado' },
];

function get(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const found = Object.entries(row).find(([header]) => normalizeHeader(header) === normalized);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCity(value: string | null) {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;

  return trimmed
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function normalizeStatus(status: string, contratado: string): SalesReferralStatus {
  const statusNorm = normalizeText(status);

  for (const entry of STATUS_MAP) {
    if (entry.match.some((match) => statusNorm.includes(normalizeText(match)))) {
      return entry.value;
    }
  }

  if (trimOrNull(contratado)) return 'contratado';
  return 'pendente';
}

function parseCadastro(value: string): Date | null {
  const { date, time } = splitBRDateTime(value);
  return parseBRDateWithTime(date, time);
}

function detectPeriod(date: Date | null) {
  const base = date ?? new Date();
  return {
    month: base.getMonth() + 1,
    year: base.getFullYear(),
  };
}

export interface ResumoIndiqueUmAmigo {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
}

export function validarHeadersIndiqueUmAmigo(rows: Record<string, string>[]) {
  if (!rows.length) throw new Error('Arquivo vazio.');

  const headers = Object.keys(rows[0]).map((header) => normalizeHeader(header));
  const required = ['cadastro', 'indicante', 'indicado', 'tel_indicado', 'cidade', 'status'];
  const missing = required.filter((item) => !headers.includes(normalizeHeader(item)));

  if (missing.length) {
    throw new Error(
      `Planilha Indique um Amigo inválida. Colunas essenciais ausentes: ${missing.join(', ')}.`
    );
  }
}

export async function importarIndiqueUmAmigo(
  rows: Record<string, string>[],
  workspaceId: string
): Promise<ResumoIndiqueUmAmigo> {
  validarHeadersIndiqueUmAmigo(rows);

  const registros: typeof salesReferralRecords.$inferInsert[] = [];
  const erros: Array<{ linha: number; erro: string }> = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    try {
      const cadastroRaw = get(row, REFERRAL_ALIASES.cadastro);
      const indicante = trimOrNull(get(row, REFERRAL_ALIASES.indicante));
      const indicado = trimOrNull(get(row, REFERRAL_ALIASES.indicado));
      const contratado = trimOrNull(get(row, REFERRAL_ALIASES.contratado));
      const telefoneIndicado = trimOrNull(get(row, REFERRAL_ALIASES.telefoneIndicado));
      const cidade = normalizeCity(get(row, REFERRAL_ALIASES.cidade));
      const rawStatus = trimOrNull(get(row, REFERRAL_ALIASES.status));

      if (!indicante && !indicado) {
        erros.push({ linha: index + 2, erro: 'Linha sem indicante e indicado válidos.' });
        continue;
      }

      const cadastroAt = parseCadastro(cadastroRaw);
      const period = detectPeriod(cadastroAt);

      registros.push({
        workspaceId,
        cadastroAt,
        indicante,
        indicado,
        contratado,
        telefoneIndicado,
        cidade,
        status: normalizeStatus(rawStatus ?? '', contratado ?? ''),
        rawStatus,
        periodMonth: period.month,
        periodYear: period.year,
      });
    } catch (error) {
      erros.push({ linha: index + 2, erro: error instanceof Error ? error.message : String(error) });
    }
  }

  if (registros.length) {
    const CHUNK = 200;
    for (let index = 0; index < registros.length; index += CHUNK) {
      await db.insert(salesReferralRecords).values(registros.slice(index, index + CHUNK));
    }
  }

  return {
    totalLidas: rows.length,
    totalInseridas: registros.length,
    totalInvalidas: erros.length,
    erros,
  };
}
