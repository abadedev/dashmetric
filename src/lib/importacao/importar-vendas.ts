import { db } from '@/lib/db';
import { salesRecords, type SalesRecordType } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

export type SalesFileProfile =
  | 'contratacoes'
  | 'contratacoes_fora_horario'
  | 'instalacoes'
  | 'cancelamentos';

type SalesCsvCategory = 'padrao' | 'fora_horario';
type SalesOriginSector = 'vendas';

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
  clientName: ['cliente', 'client_name', 'nome_cliente', 'nome', 'assinante', 'nome_assinante', 'razao_social'],
  city: ['cidade', 'city', 'cidade_uf', 'municipio', 'localidade', 'cidade_cliente'],
  indication: ['indicacao', 'origem', 'canal', 'origem_lead', 'origem_venda', 'midia', 'campanha', 'canal_venda'],
  plan: ['plano', 'plan', 'produto', 'pacote', 'combo', 'plano_contratado'],
  observation: ['observacao', 'obs', 'detalhe', 'comentario', 'status', 'observacoes', 'descricao'],
  requestedAt: ['dataPedido', 'datapedido', 'data_pedido', 'data', 'dataCadastro', 'data_cadastro', 'data_solicitacao'],
  installedAt: ['dataInstalacao', 'datainstalacao', 'data_instalacao', 'instalado_em', 'data_ativacao'],
  unnamed3: ['Unnamed: 3', 'Unnamed 3', 'unnamed_3', ''],
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

function normalizeFileName(fileName: string | null | undefined) {
  return normalizeText(fileName ?? '');
}

function isOutsideBusinessHoursFileName(fileName: string | null | undefined) {
  const normalized = normalizeFileName(fileName);
  if (!normalized) return false;

  return (
    normalized.includes('fora do horario') ||
    normalized.includes('fora horario') ||
    normalized.includes('horario comercial') ||
    normalized.includes('presencial')
  );
}

export function detectSalesFileProfile(headers: string[], fileName?: string | null): SalesFileProfile | null {
  const normalized = headers.map(normalizeHeader);
  const has = (...values: string[]) =>
    values.some((value) => normalized.includes(normalizeHeader(value)));
  const hasAll = (...values: string[]) => values.every((value) => has(value));

  if (
    isOutsideBusinessHoursFileName(fileName) &&
    (hasAll('Cliente', 'Cidade', 'Indicacao') || hasAll('Nome', 'Cidade', 'Origem'))
  ) {
    return 'contratacoes_fora_horario';
  }

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
  recordType: SalesRecordType,
  csvCategory: SalesCsvCategory
): typeof salesRecords.$inferInsert {
  const clientName = trimOrNull(get(row, SALES_ALIASES.clientName));
  const city = trimOrNull(get(row, SALES_ALIASES.city));
  const indication = trimOrNull(get(row, SALES_ALIASES.indication));
  const plan = trimOrNull(get(row, SALES_ALIASES.plan));
  const observation = buildObservation(row);
  const requestedAt = parseBRDate(get(row, SALES_ALIASES.requestedAt)) ?? new Date();
  const installedAt = parseBRDate(get(row, SALES_ALIASES.installedAt));

  return {
    recordType,
    originSector: 'vendas' satisfies SalesOriginSector,
    csvCategory,
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

function buildObservation(row: Record<string, string>) {
  const observation = trimOrNull(get(row, SALES_ALIASES.observation));
  const unnamed3 = trimOrNull(get(row, SALES_ALIASES.unnamed3));

  if (!unnamed3) return observation;
  if (!observation) return `Coluna auxiliar Unnamed: 3 = ${unnamed3}`;
  return `${observation} | Coluna auxiliar Unnamed: 3 = ${unnamed3}`;
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
}

export async function importarVendas(
  linhas: Record<string, string>[],
  workspaceId: string,
  fileName?: string | null
): Promise<ResumoVendas> {
  const perfil = detectSalesFileProfile(Object.keys(linhas[0] ?? {}), fileName);

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
    contratacoes_fora_horario: 'fechado',
    instalacoes: 'pedido_instalado',
    cancelamentos: 'pedido_cancelado',
  };

  const csvCategoryMap: Record<SalesFileProfile, SalesCsvCategory> = {
    contratacoes: 'padrao',
    contratacoes_fora_horario: 'fora_horario',
    instalacoes: 'padrao',
    cancelamentos: 'padrao',
  };

  const registros: typeof salesRecords.$inferInsert[] = [];

  for (let index = 0; index < linhas.length; index++) {
    try {
      const row = linhas[index];
      const baseRecord = buildSalesRecord(row, recordTypeMap[perfil], csvCategoryMap[perfil]);
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
      await db.insert(salesRecords).values(
        registros.slice(index, index + CHUNK).map((r) => ({ ...r, workspaceId }))
      );
    }
    resumo.totalInseridas = registros.length;
  }

  return resumo;
}
