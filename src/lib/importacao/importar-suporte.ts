import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportRecords, supportCallCategories } from '@/lib/db/schema';
import { normalizeHeader, normalizeTechName, parseBRDateWithTime, splitBRDateTime, trimOrNull } from './helpers';
import { buildSupportSummary, classifySupportRecord, type SupportCategoryItem } from './classify-support';

// ── Aliases de colunas ────────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  tecnico:            ['tecnico', 'tecnico_nome', 'nome_tecnico', 'instalador', 'technician'],
  atendente:          ['atendente', 'nome_atendente', 'operador', 'responsavel'],
  aberturaManutExt:   ['abertura_manut_ext', 'manut_ext', 'manutencao_ext', 'manutencao_externa',
                       'abertura_manut', 'qtd_manut_ext', 'aberturas_manut_ext'],
  percentual:         ['percentual', 'percent', '%', 'porcentagem', 'pct'],
  semManut:           ['sem_manut', 'sem_manutencao', 'sem_manut_ext', 'abertura_sem_manut'],
  total:              ['total', 'total_atendimentos', 'qtd_total'],
  mes:                ['mes', 'month', 'periodo', 'competencia'],
  ano:                ['ano', 'year'],
  dataAbertura:       ['dataAbertura', 'data_abertura', 'datapedido', 'data_pedido', 'abertura', 'data', 'data_chamado'],
  horaAbertura:       ['horaAbertura', 'hora_abertura', 'horaInicio', 'hora_inicio'],
  dataFinalizacao:    ['dataFechamento', 'dataFinalizacao', 'data_finalizacao', 'data_final', 'fechamento', 'finalizacao', 'data_fechamento'],
  horaFinalizacao:    ['horaFinalizacao', 'hora_finalizacao', 'horaSaida', 'hora_saida', 'hora_fechamento'],
  problemaReclamado:  ['problemareclamado', 'problema_reclamado', 'problema', 'reclamacao',
                       'motivo', 'descricao', 'assunto'],
};

function get(row: Record<string, string>, key: string): string {
  const aliases = ALIASES[key] ?? [key];
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const found = Object.entries(row).find(([k]) => normalizeHeader(k) === normAlias);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

function toInt(v: string): number {
  const n = parseInt(v.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function toDecimal(v: string): string | null {
  const cleaned = v.replace(',', '.').replace(/[^\d.]/g, '');
  return cleaned === '' ? null : cleaned;
}

function resolveSupportRowTotal(row: Record<string, string>) {
  const explicitTotal = toInt(get(row, 'total'));
  return explicitTotal > 0 ? explicitTotal : 1;
}

function parseSupportDateTime(dateValue: string, timeValue: string): Date | null {
  if (!dateValue) return null;
  const combined = splitBRDateTime(dateValue);
  const resolvedDate = combined.date || dateValue;
  const resolvedTime = timeValue || combined.time;
  return parseBRDateWithTime(resolvedDate, resolvedTime);
}

export function resolveSupportAttendantName(row: Record<string, string>): string | null {
  const tecnico = trimOrNull(get(row, 'tecnico'));
  if (tecnico) return normalizeTechName(tecnico);

  const atendente = trimOrNull(get(row, 'atendente'));
  if (atendente) return normalizeTechName(atendente);

  return null;
}

export function resolveSupportPeriod(
  row: Record<string, string>,
  fallbackMonth: number,
  fallbackYear: number
) {
  const mesLinha = get(row, 'mes');
  const anoLinha = get(row, 'ano');
  const openedAt = parseSupportDateTime(get(row, 'dataAbertura'), get(row, 'horaAbertura'));
  const closedAt = parseSupportDateTime(get(row, 'dataFinalizacao'), get(row, 'horaFinalizacao'));
  const periodDate = closedAt ?? openedAt;

  return {
    openedAt,
    closedAt,
    month: periodDate
      ? periodDate.getMonth() + 1
      : mesLinha ? toInt(mesLinha) || fallbackMonth : fallbackMonth,
    year: periodDate
      ? periodDate.getFullYear()
      : anoLinha ? toInt(anoLinha) || fallbackYear : fallbackYear,
  };
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ResumoSuporte {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
  categoriasResumo: SupportCategoryItem[];
}

// ── Importação principal ──────────────────────────────────────────────────────

export async function importarSuporte(
  linhas: Record<string, string>[],
  periodMonth: number,
  periodYear: number,
  workspaceId: string
): Promise<ResumoSuporte> {
  const resumo: ResumoSuporte = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
    categoriasResumo: [],
  };

  const registros: typeof supportRecords.$inferInsert[] = [];
  // Agrupa problemas por período real de cada linha (não pelo lote)
  const problemasPorPeriodo = new Map<string, { month: number; year: number; records: Array<{ problemaReclamado: string }> }>();

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const numLinha = i + 2;

    try {
      const atendente = resolveSupportAttendantName(row);
      if (!atendente) {
        resumo.erros.push({ linha: numLinha, erro: 'Campo "tecnico" ou "atendente" ausente' });
        resumo.totalInvalidas++;
        continue;
      }

      // Respeita mês/ano da linha se existir, senão usa o do lote
      const { openedAt, closedAt, month, year } = resolveSupportPeriod(row, periodMonth, periodYear);
      const supportCategory = classifySupportRecord(get(row, 'problemaReclamado'));

      registros.push({
        workspaceId,
        attendantName:  atendente,
        supportCategory,
        openedManutExt: toInt(get(row, 'aberturaManutExt')),
        percentage:     toDecimal(get(row, 'percentual')),
        withoutManut:   toInt(get(row, 'semManut')),
        total:          resolveSupportRowTotal(row),
        openedAt,
        closedAt,
        periodMonth:    month,
        periodYear:     year,
      });

      // Coleta ProblemaReclamado agrupado pelo período real da linha
      const periodoKey = `${year}-${month}`;
      const entrada = problemasPorPeriodo.get(periodoKey) ?? { month, year, records: [] };
      entrada.records.push({ problemaReclamado: get(row, 'problemaReclamado') });
      problemasPorPeriodo.set(periodoKey, entrada);
    } catch (err: unknown) {
      resumo.erros.push({ linha: numLinha, erro: String(err) });
      resumo.totalInvalidas++;
    }
  }

  // ── Persiste registros de suporte (comportamento original) ────────────────
  if (registros.length) {
    const CHUNK = 200;
    for (let i = 0; i < registros.length; i += CHUNK) {
      await db.insert(supportRecords).values(registros.slice(i, i + CHUNK));
    }
    resumo.totalInseridas = registros.length;
  }

  // ── Classificação automática por ProblemaReclamado (por período) ──────────
  const todasCategorias: SupportCategoryItem[] = [];
  for (const { month, year, records } of problemasPorPeriodo.values()) {
    const summary = buildSupportSummary(records);
    if (!summary.length) continue;

    todasCategorias.push(...summary);

    await db
      .delete(supportCallCategories)
      .where(
        and(
          eq(supportCallCategories.workspaceId, workspaceId),
          eq(supportCallCategories.periodMonth, month),
          eq(supportCallCategories.periodYear, year)
        )
      );

    await db.insert(supportCallCategories).values(
      summary.map((item) => ({
        workspaceId,
        categoria:   item.tipo,
        quantidade:  item.quantidade,
        percentual:  String(item.percentual),
        periodMonth: month,
        periodYear:  year,
      }))
    );
  }

  resumo.categoriasResumo = todasCategorias;

  return resumo;
}
