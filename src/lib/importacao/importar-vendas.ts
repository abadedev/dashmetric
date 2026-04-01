import { db } from '@/lib/db';
import { salesRecords, type SalesRecordType } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';
import { importarCancelamentosDerivadosDeVendas } from './importar-cancelamentos';

type SalesFileProfile = 'contratacoes' | 'instalacoes' | 'cancelamentos';

const MARKETING_PATTERNS = [
  'marketing',
  'digital',
  'facebook',
  'instagram',
  'google',
  'meta',
  'site',
  'lead',
  'trafego',
  'anuncio',
  'campanha',
  'landing page',
  'midia paga',
  'ads',
];

const SALES_ALIASES = {
  clientName: ['cliente', 'client_name', 'nome_cliente', 'nome', 'assinante'],
  city: ['cidade', 'city', 'cidade_uf', 'municipio'],
  indication: ['indicacao', 'origem', 'canal', 'origem_lead', 'origem_venda'],
  plan: ['plano', 'plan', 'produto'],
  observation: ['observacao', 'obs', 'detalhe', 'comentario', 'status'],
  requestedAt: ['dataPedido', 'datapedido', 'data_pedido', 'data', 'dataCadastro', 'data_cadastro'],
  installedAt: ['dataInstalacao', 'datainstalacao', 'data_instalacao', 'instalado_em'],
};

function normalizeText(value: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function get(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const found = Object.entries(row).find(([header]) => normalizeHeader(header) === normalized);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

export function detectSalesFileProfile(headers: string[]): SalesFileProfile | null {
  const normalized = headers.map(normalizeHeader);
  const has = (...values: string[]) =>
    values.some((value) => normalized.includes(normalizeHeader(value)));
  const hasAll = (...values: string[]) => values.every((value) => has(value));

  if (hasAll('dataPedido', 'Cidade') && has('dataInstalacao', 'instalado_em')) {
    return 'instalacoes';
  }

  if (
    hasAll('dataPedido', 'Cidade', 'Indicacao', 'Plano') &&
    has('Observacao', 'status', 'motivo', 'motivo_cancelamento')
  ) {
    return 'cancelamentos';
  }

  if (hasAll('Cliente', 'Cidade', 'Indicacao') || hasAll('Nome', 'Cidade', 'Origem')) {
    return 'contratacoes';
  }

  return null;
}

function normalizeSource(indication: string | null) {
  const value = normalizeText(indication ?? '');
  if (!value) return null;
  if (MARKETING_PATTERNS.some((pattern) => value.includes(pattern))) {
    return 'marketing_digital';
  }
  if (value.includes('whatsapp')) return 'whatsapp';
  if (value.includes('ligacao') || value.includes('telefone')) return 'telefone';
  if (value.includes('fora do horario') || value.includes('fora_horario') || value.includes('horario comercial')) {
    return 'fora_horario_comercial';
  }
  if (value.includes('presencial')) return 'presencial';
  if (value.includes('indicacao')) return 'indicacao';
  return value;
}

function isMarketingDigital(indication: string | null) {
  const normalized = normalizeText(indication ?? '');
  return MARKETING_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function buildSalesRecord(
  row: Record<string, string>,
  recordType: SalesRecordType
): typeof salesRecords.$inferInsert {
  const clientName = trimOrNull(get(row, SALES_ALIASES.clientName));
  const city = trimOrNull(get(row, SALES_ALIASES.city));
  const indication = trimOrNull(get(row, SALES_ALIASES.indication));
  const plan = trimOrNull(get(row, SALES_ALIASES.plan));
  const observation = trimOrNull(get(row, SALES_ALIASES.observation));
  const requestedAt = parseBRDate(get(row, SALES_ALIASES.requestedAt)) ?? new Date();
  const installedAt = parseBRDate(get(row, SALES_ALIASES.installedAt));

  return {
    recordType,
    clientName,
    city,
    source: normalizeSource(indication),
    indication,
    plan,
    observation,
    requestedAt,
    installedAt,
    periodMonth: (installedAt ?? requestedAt).getMonth() + 1,
    periodYear: (installedAt ?? requestedAt).getFullYear(),
  };
}

function shouldCreateMarketingLead(
  indication: string | null,
  source: string | null,
  observation: string | null
) {
  if (source === 'marketing_digital') return true;

  const combined = normalizeText([indication, observation].filter(Boolean).join(' '));
  return MARKETING_PATTERNS.some((pattern) => combined.includes(pattern));
}

export interface ResumoVendas {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  perfilDetectado: SalesFileProfile;
  erros: Array<{ linha: number; erro: string }>;
  cancelamentosGerados?: number;
}

export async function importarVendas(
  linhas: Record<string, string>[]
): Promise<ResumoVendas> {
  const perfil = detectSalesFileProfile(Object.keys(linhas[0] ?? {}));

  if (!perfil) {
    throw new Error('Nao foi possivel identificar o padrao do arquivo de vendas.');
  }

  const resumo: ResumoVendas = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    perfilDetectado: perfil,
    erros: [],
  };

  const recordTypeMap: Record<SalesFileProfile, SalesRecordType> = {
    contratacoes: 'negociado',
    instalacoes: 'pedido_instalado',
    cancelamentos: 'pedido_cancelado',
  };

  const registros: typeof salesRecords.$inferInsert[] = [];

  for (let index = 0; index < linhas.length; index++) {
    try {
      const row = linhas[index];
      const baseRecord = buildSalesRecord(row, recordTypeMap[perfil]);
      registros.push(baseRecord);

      if (perfil === 'contratacoes') {
        registros.push({
          ...baseRecord,
          recordType: 'fechado',
        });

        if (
          shouldCreateMarketingLead(
            baseRecord.indication ?? null,
            baseRecord.source ?? null,
            baseRecord.observation ?? null
          )
        ) {
          registros.push({
            ...baseRecord,
            recordType: 'lead_marketing',
          });
        }
      }
    } catch (error) {
      resumo.totalInvalidas++;
      resumo.erros.push({
        linha: index + 2,
        erro: String(error),
      });
    }
  }

  if (registros.length) {
    const CHUNK = 200;
    for (let index = 0; index < registros.length; index += CHUNK) {
      await db.insert(salesRecords).values(registros.slice(index, index + CHUNK));
    }
    resumo.totalInseridas = registros.length;
  }

  if (perfil === 'cancelamentos' && linhas.length) {
    const cancellationSummary = await importarCancelamentosDerivadosDeVendas(linhas);
    resumo.cancelamentosGerados = cancellationSummary.totalInseridas;
  }

  return resumo;
}
