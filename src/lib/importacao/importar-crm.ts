import { db } from '@/lib/db';
import { salesRecords } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

const STATUS_MAP: Record<string, string | null> = {
  ganho: 'fechado',
  'venda recuperada': 'fechado',
  lead: 'negociado',
  'follow up': 'negociado',
  negociacao: 'negociado',
  duvidas: 'negociado',
  perdido: null,
  'adm/financeiro': null,
  suporte: null,
};

export function normalizeStatus(raw: string): string | null {
  const key = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return STATUS_MAP[key] ?? null;
}

const ALIASES = {
  clientName: ['nome', 'cliente', 'nome_do_cliente'],
  city: ['cidade'],
  status: ['status'],
  vendedor: ['vendedor'],
  plan: ['valor', 'plano'],
  observation: ['observacoes', 'observacao', 'motivo_de_perda'],
  requestedAt: ['data'],
};

function get(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const norm = normalizeHeader(alias);
    const found = Object.entries(row).find(([key]) => normalizeHeader(key) === norm);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

export function mapCrmRow(
  row: Record<string, string>,
  workspaceId?: string
): typeof salesRecords.$inferInsert | null {
  const rawStatus = get(row, ALIASES.status);
  const recordType = normalizeStatus(rawStatus);

  if (!recordType) {
    return null;
  }

  const dateValue = get(row, ALIASES.requestedAt);
  const requestedAt = parseBRDate(dateValue) ?? new Date();

  return {
    workspaceId: workspaceId ?? null,
    recordType: recordType as 'negociado' | 'fechado',
    originSector: 'vendas',
    csvCategory: 'crm',
    clientName: trimOrNull(get(row, ALIASES.clientName)),
    city: trimOrNull(get(row, ALIASES.city)),
    source: trimOrNull(get(row, ALIASES.vendedor)),
    plan: trimOrNull(get(row, ALIASES.plan)),
    observation: trimOrNull(get(row, ALIASES.observation)),
    requestedAt,
    installedAt: null,
    periodMonth: requestedAt.getMonth() + 1,
    periodYear: requestedAt.getFullYear(),
  };
}

export interface ResumoCRM {
  totalLidas: number;
  totalInseridas: number;
  totalIgnoradas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
}

export async function importarCRM(
  linhas: Record<string, string>[],
  workspaceId?: string
): Promise<ResumoCRM> {
  const resumo: ResumoCRM = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalIgnoradas: 0,
    totalInvalidas: 0,
    erros: [],
  };

  const registros: typeof salesRecords.$inferInsert[] = [];

  for (let i = 0; i < linhas.length; i++) {
    try {
      const mapped = mapCrmRow(linhas[i], workspaceId);
      if (!mapped) {
        resumo.totalIgnoradas++;
        continue;
      }

      registros.push(mapped);
    } catch (err) {
      resumo.totalInvalidas++;
      resumo.erros.push({ linha: i + 2, erro: String(err) });
    }
  }

  if (registros.length) {
    const CHUNK = 200;
    for (let i = 0; i < registros.length; i += CHUNK) {
      await db.insert(salesRecords).values(registros.slice(i, i + CHUNK));
    }
    resumo.totalInseridas = registros.length;
  }

  return resumo;
}
