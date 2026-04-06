import { db } from '@/lib/db';
import { technicians, qualityRecords } from '@/lib/db/schema';
import type { NewQualityRecord } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { normalizeHeader, trimOrNull, parseBRDateWithTime, normalizeTechName } from './helpers';

// ── Mapa de indicadores ───────────────────────────────────────────────────────

const INDICADOR_MAP: Record<string, string> = {
  'iqiv':                              'IQIv',
  'instal._recente_(iqiv)':            'IQIv',
  'instal_recente_iqiv':               'IQIv',
  'instal_recente_(iqiv)':             'IQIv',
  'instalacao_recente_(iqiv)':         'IQIv',
  'iqiv (rep. apos inst)':             'IQIv',
  'iqiv (reparo apos instalacao)':     'IQIv',
  'reparo apos instalacao':            'IQIv',
  'iqrv':                              'IQRv',
  'reparo_reincidente_(iqrv)':         'IQRv',
  'iqrv (rep. reincidente)':           'IQRv',
  'reparo reincidente':                'IQRv',
  'reincidente':                       'IQRv',
  'rtv':                               'RTV',
  'rtv (varejo/anatel)':               'RTV',
  'varejo/anatel':                     'RTV',
  'rst':                               'RST',
  'rst (servico tec.)':                'RST',
  'rst (servico tecnico)':             'RST',
  'servico tecnico':                   'RST',
  'ict':                               'ICT',
  'cancelamento_tecnico_(ict)':        'ICT',
  'cancelamento tecnico (ict)':        'ICT',
  'ict (inviabilidade)':               'ICT',
  'inviabilidade':                     'ICT',
  'retorno':                           'Retorno',
  'retorno geral':                     'Retorno',
};

const VALID_INDICATORS = ['IQIv', 'IQRv', 'RTV', 'RST', 'ICT', 'Retorno'] as const;
type QualityIndicator = typeof VALID_INDICATORS[number];

function normalizarIndicador(raw: string): QualityIndicator | null {
  const trimmed = (raw ?? '').trim();

  // BUGFIX: string vazia nunca pode virar indicador válido
  if (!trimmed) return null;

  const key = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Correspondência exata
  const found = INDICADOR_MAP[key];
  if (found) return found as QualityIndicator;

  // 2. Busca parcial — só ativa se key tiver 3+ chars para evitar falsos positivos
  if (key.length >= 3) {
    for (const [k, v] of Object.entries(INDICADOR_MAP)) {
      if (k.length >= 3 && (key.includes(k) || k.includes(key))) {
        return v as QualityIndicator;
      }
    }
  }

  return null;
}

// ── Aliases de colunas ────────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  numeroOs:       ['#', 'n_os', 'numero_os', 'numeroos', 'os', 'numero'],
  indicador:      ['indicador', 'indicator', 'tipo_indicador', 'ind', 'indicador_qualidade', 'indicadores'],
  motivo:         ['motivo', 'razao', 'motivo_reclamacao', 'descricao', 'reason', 'problema', 'descricao_chamado'],
  solucao:        ['solucao', 'solucao_dada', 'resolucao', 'tratativa', 'procedimento'],
  tecnico:        ['tecnico', 'instalador', 'responsavel', 'tecnico_nome', 'nome_tecnico'],
  cliente:        ['cliente', 'nome_cliente', 'client', 'assinante', 'nome_assinante'],
  cidade:         ['cidade', 'municipio', 'localidade', 'cidade_uf'],
  plano:          ['plano', 'plano_contratado', 'produto', 'pacote'],
  dataAbertura:   ['data_abertura', 'datapedido', 'data_pedido', 'abertura', 'data', 'data_chamado'],
  horaAbertura:   ['hora_abertura', 'hora_inicio'],
  dataFinalizacao:['data_finalizacao', 'data_final', 'fechamento', 'finalizacao', 'data_fechamento'],
  horaFinalizacao:['hora_finalizacao', 'hora_saida', 'hora_fechamento'],
};

/**
 * Busca o valor de um campo no row usando aliases.
 * Primeiro tenta correspondência exata (header já normalizado),
 * depois tenta substring para ser mais tolerante com nomes de coluna variados.
 */
function get(row: Record<string, string>, key: string): string {
  const aliases = ALIASES[key] ?? [key];
  const rowKeys = Object.keys(row);

  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);

    // 1. Correspondência exata
    const exact = rowKeys.find((k) => k === normAlias || normalizeHeader(k) === normAlias);
    if (exact && row[exact]?.trim()) return row[exact].trim();

    // 2. Substring: header do arquivo contém o alias ou vice-versa
    const partial = rowKeys.find((k) => {
      const normK = normalizeHeader(k);
      return normK.includes(normAlias) || normAlias.includes(normK);
    });
    if (partial && row[partial]?.trim()) return row[partial].trim();
  }

  return '';
}

function getIndicador(row: Record<string, string>): string {
  const rowKeys = Object.keys(row);
  const aliases = ALIASES.indicador ?? ['indicador'];

  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const exact = rowKeys.find((k) => normalizeHeader(k) === normAlias);
    if (exact && row[exact]?.trim()) return row[exact].trim();
  }

  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const partial = rowKeys.find((k) => {
      const normK = normalizeHeader(k);
      return normK.includes(normAlias) || normAlias.includes(normK);
    });
    if (partial && row[partial]?.trim()) return row[partial].trim();
  }

  return '';
}

// ── Resolução de técnico ──────────────────────────────────────────────────────

const tecnicoCache = new Map<string, number>();

async function resolverTecnico(
  nome: string,
  workspaceId: string,
  executor: DbExecutor = db
): Promise<number | null> {
  if (!nome) return null;
  const normNome = normalizeTechName(nome);
  const cacheKey = `${workspaceId}:${normNome}`;
  if (tecnicoCache.has(cacheKey)) return tecnicoCache.get(cacheKey)!;

  const existing = await executor.query.technicians.findFirst({
    where: (t, { and: andFn, eq: eqFn, sql }) =>
      andFn(
        eqFn(t.workspaceId, workspaceId),
        sql`lower(${t.name}) = lower(${normNome})`
      ),
  });
  if (existing) {
    tecnicoCache.set(cacheKey, existing.id);
    return existing.id;
  }
  const [created] = await executor
    .insert(technicians)
    .values({ workspaceId, name: normNome })
    .returning();
  tecnicoCache.set(cacheKey, created.id);
  return created.id;
}

// ── Importação principal ──────────────────────────────────────────────────────

export interface ResumoQualidade {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
  warnings: Array<{ linha: number; aviso: string }>;
  /** Para debug: coluna de indicador detectada e sample de valores */
  debug?: { indicadorColuna: string; sampleIndicadores: string[] };
}

export interface PeriodoQualidade {
  periodMonth: number;
  periodYear: number;
}

type DbExecutor = typeof db;

interface RegistroQualidadePendente {
  linha: number;
  record: NewQualityRecord;
}

function formatPgError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  const pgErr = err as Error & {
    code?: string;
    detail?: string;
    constraint?: string;
    column?: string;
    table?: string;
  };

  const extras = [
    pgErr.code ? `code=${pgErr.code}` : null,
    pgErr.table ? `table=${pgErr.table}` : null,
    pgErr.column ? `column=${pgErr.column}` : null,
    pgErr.constraint ? `constraint=${pgErr.constraint}` : null,
    pgErr.detail ? `detail=${pgErr.detail}` : null,
  ].filter(Boolean);

  return extras.length > 0 ? `${pgErr.message} (${extras.join(', ')})` : pgErr.message;
}

function validarTamanhoCampo(
  resumo: ResumoQualidade,
  linha: number,
  campo: string,
  valor: string | null | undefined,
  limite: number
): boolean {
  if (!valor || valor.length <= limite) return true;

  resumo.erros.push({
    linha,
    erro: `Campo "${campo}" excede o limite de ${limite} caracteres (${valor.length}).`,
  });
  resumo.totalInvalidas++;
  return false;
}

function validarRegistroParaInsert(
  resumo: ResumoQualidade,
  linha: number,
  record: NewQualityRecord
): boolean {
  return [
    validarTamanhoCampo(resumo, linha, 'os_number', record.osNumber, 20),
    validarTamanhoCampo(resumo, linha, 'technician_name', record.technicianName, 255),
    validarTamanhoCampo(resumo, linha, 'client_name', record.clientName, 255),
    validarTamanhoCampo(resumo, linha, 'city', record.city, 100),
    validarTamanhoCampo(resumo, linha, 'plan', record.plan, 255),
  ].every(Boolean);
}

export function inferirPeriodosQualidade(linhas: Record<string, string>[]): PeriodoQualidade[] {
  const periodos = new Map<string, PeriodoQualidade>();

  for (const row of linhas) {
    const rawData = get(row, 'dataAbertura');
    const rawHora = get(row, 'horaAbertura');
    const openedAt = rawData ? parseBRDateWithTime(rawData, rawHora) : null;

    if (!openedAt) continue;

    const periodo = {
      periodMonth: openedAt.getMonth() + 1,
      periodYear: openedAt.getFullYear(),
    };

    periodos.set(`${periodo.periodYear}-${periodo.periodMonth}`, periodo);
  }

  return Array.from(periodos.values());
}

export async function limparQualidadePorPeriodos(
  periodos: PeriodoQualidade[],
  workspaceId: string,
  executor: DbExecutor = db
): Promise<number> {
  let totalRemovido = 0;

  for (const periodo of periodos) {
    const deleted = await executor
      .delete(qualityRecords)
      .where(
        and(
          eq(qualityRecords.workspaceId, workspaceId),
          eq(qualityRecords.periodMonth, periodo.periodMonth),
          eq(qualityRecords.periodYear, periodo.periodYear)
        )
      )
      .returning({ id: qualityRecords.id });
    totalRemovido += deleted.length;
  }

  return totalRemovido;
}

export async function importarQualidade(
  linhas: Record<string, string>[],
  workspaceId: string,
  executor: DbExecutor = db
): Promise<ResumoQualidade> {
  // Reset cache por importação
  tecnicoCache.clear();

  const resumo: ResumoQualidade = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
    warnings: [],
  };

  if (!linhas.length) return resumo;

  // Debug: mostra qual coluna de indicador foi detectada
  const primeiraLinha = linhas[0];
  const indicadorKey = Object.keys(primeiraLinha).find((k) => {
    const norm = normalizeHeader(k);
    return ['indicador', 'indicator', 'ind', 'indicadores', 'tipo_indicador'].some(
      (a) => norm === a || norm.includes(a) || a.includes(norm)
    );
  });
  const sampleIndicadores = linhas.slice(0, 5).map((r) => getIndicador(r));

  resumo.debug = {
    indicadorColuna: indicadorKey ?? '(não encontrado)',
    sampleIndicadores,
  };

  // Processa e acumula registros válidos para insert em batch
  const registros: RegistroQualidadePendente[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const numLinha = i + 2;

    try {
      const rawIndicador = getIndicador(row);
      const indicador = normalizarIndicador(rawIndicador);

      if (!indicador) {
        resumo.erros.push({
          linha: numLinha,
          erro: `Indicador inválido ou não reconhecido: "${rawIndicador || '(vazio)'}"`,
        });
        resumo.totalInvalidas++;
        continue;
      }

      const rawData = get(row, 'dataAbertura');
      const rawHora = get(row, 'horaAbertura');
      const openedAt = rawData ? parseBRDateWithTime(rawData, rawHora) : null;

      const rawDataFim = get(row, 'dataFinalizacao');
      const rawHoraFim = get(row, 'horaFinalizacao');
      const closedAt = rawDataFim ? parseBRDateWithTime(rawDataFim, rawHoraFim) : null;

      let durationSeconds: number | null = null;
      if (openedAt && closedAt) {
        durationSeconds = Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000);
      }

      const tecnicoNome = get(row, 'tecnico');
      const tecnicoId = tecnicoNome ? await resolverTecnico(tecnicoNome, workspaceId, executor) : null;

      const periodDate = openedAt ?? new Date();

      const record: NewQualityRecord = {
        workspaceId,
        osNumber:       trimOrNull(get(row, 'numeroOs')),
        indicator:      indicador,
        reason:         trimOrNull(get(row, 'motivo')),
        solution:       trimOrNull(get(row, 'solucao')),
        technicianId:   tecnicoId,
        technicianName: tecnicoNome ? trimOrNull(tecnicoNome) : null,
        clientName:     trimOrNull(get(row, 'cliente')),
        city:           trimOrNull(get(row, 'cidade')),
        plan:           trimOrNull(get(row, 'plano')),
        openedAt:       openedAt ?? null,
        closedAt:       closedAt ?? null,
        durationSeconds,
        periodMonth:    periodDate.getMonth() + 1,
        periodYear:     periodDate.getFullYear(),
        createdAt:      new Date(),
      };

      if (!validarRegistroParaInsert(resumo, numLinha, record)) {
        continue;
      }

      registros.push({
        linha: numLinha,
        record,
      });
    } catch (err: unknown) {
      resumo.erros.push({ linha: numLinha, erro: String(err) });
      resumo.totalInvalidas++;
    }
  }

  // Insert em batch de 200
  const CHUNK = 200;
  for (let i = 0; i < registros.length; i += CHUNK) {
    const chunk = registros.slice(i, i + CHUNK);
    try {
      await executor.insert(qualityRecords).values(chunk.map(({ record }) => record));
      resumo.totalInseridas += chunk.length;
    } catch (err: unknown) {
      // Fallback: insere um a um para identificar o problema
      for (const { linha, record } of chunk) {
        try {
          await executor.insert(qualityRecords).values(record);
          resumo.totalInseridas++;
        } catch (itemErr: unknown) {
          resumo.erros.push({
            linha,
            erro: `PostgreSQL Error: ${formatPgError(itemErr)}`,
          });
          resumo.totalInvalidas++;
        }
      }
    }
  }

  return resumo;
}
