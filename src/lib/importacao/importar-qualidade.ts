import { db } from '@/lib/db';
import { qualityRecords, technicians } from '@/lib/db/schema';
import { normalizeHeader, trimOrNull, parseBRDateWithTime, normalizeTechName } from './helpers';

// ── Mapa de indicadores ───────────────────────────────────────────────────────

const INDICADOR_MAP: Record<string, string> = {
  'iqiv':                              'IQIv',
  'iqiv (rep. apos inst)':             'IQIv',
  'iqiv (reparo apos instalacao)':     'IQIv',
  'reparo apos instalacao':            'IQIv',
  'iqrv':                              'IQRv',
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
  indicador:      ['indicador', 'indicator', 'tipo_indicador', 'ind', 'indicador_qualidade', 'tipo', 'indicadores'],
  motivo:         ['motivo', 'razao', 'motivo_reclamacao', 'descricao', 'reason'],
  solucao:        ['solucao', 'solucao_dada', 'resolucao'],
  tecnico:        ['tecnico', 'instalador', 'responsavel', 'tecnico_nome'],
  cliente:        ['cliente', 'nome_cliente', 'client'],
  cidade:         ['cidade', 'municipio'],
  plano:          ['plano'],
  dataAbertura:   ['data_abertura', 'datapedido', 'data_pedido', 'abertura', 'data'],
  horaAbertura:   ['hora_abertura', 'hora_inicio'],
  dataFinalizacao:['data_finalizacao', 'data_final', 'fechamento', 'finalizacao'],
  horaFinalizacao:['hora_finalizacao', 'hora_saida'],
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

// ── Resolução de técnico ──────────────────────────────────────────────────────

const tecnicoCache = new Map<string, number>();

async function resolverTecnico(nome: string): Promise<number | null> {
  if (!nome) return null;
  const normNome = normalizeTechName(nome);
  if (tecnicoCache.has(normNome)) return tecnicoCache.get(normNome)!;

  const existing = await db.query.technicians.findFirst({
    where: (t, { eq: eqFn }) => eqFn(t.name, normNome),
  });
  if (existing) {
    tecnicoCache.set(normNome, existing.id);
    return existing.id;
  }
  const [created] = await db.insert(technicians).values({ name: normNome }).returning();
  tecnicoCache.set(normNome, created.id);
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

export async function importarQualidade(
  linhas: Record<string, string>[]
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
  const sampleIndicadores = linhas.slice(0, 5).map((r) => get(r, 'indicador'));

  resumo.debug = {
    indicadorColuna: indicadorKey ?? '(não encontrado)',
    sampleIndicadores,
  };

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const numLinha = i + 2;

    try {
      const rawIndicador = get(row, 'indicador');
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
      const tecnicoId = tecnicoNome ? await resolverTecnico(tecnicoNome) : null;

      const periodDate = openedAt ?? new Date();

      await db.insert(qualityRecords).values({
        osNumber:        trimOrNull(get(row, 'numeroOs')),
        indicator:       indicador as any,
        reason:          trimOrNull(get(row, 'motivo')),
        solution:        trimOrNull(get(row, 'solucao')),
        technicianId:    tecnicoId,
        clientName:      trimOrNull(get(row, 'cliente')),
        city:            trimOrNull(get(row, 'cidade')),
        plan:            trimOrNull(get(row, 'plano')),
        openedAt:        openedAt ?? undefined,
        closedAt:        closedAt ?? undefined,
        durationSeconds: durationSeconds,
        periodMonth:     periodDate.getMonth() + 1,
        periodYear:      periodDate.getFullYear(),
      });

      resumo.totalInseridas++;
    } catch (err: unknown) {
      resumo.erros.push({ linha: numLinha, erro: String(err) });
      resumo.totalInvalidas++;
    }
  }

  return resumo;
}
