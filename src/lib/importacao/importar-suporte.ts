import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { supportRecords, supportCallCategories } from '@/lib/db/schema';
import { normalizeHeader, trimOrNull } from './helpers';
import { buildSupportSummary, type SupportCategoryItem } from './classify-support';

// ── Aliases de colunas ────────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  atendente:          ['atendente', 'nome_atendente', 'operador', 'responsavel'],
  aberturaManutExt:   ['abertura_manut_ext', 'manut_ext', 'manutencao_ext', 'manutencao_externa',
                       'abertura_manut', 'qtd_manut_ext', 'aberturas_manut_ext'],
  percentual:         ['percentual', 'percent', '%', 'porcentagem', 'pct'],
  semManut:           ['sem_manut', 'sem_manutencao', 'sem_manut_ext', 'abertura_sem_manut'],
  total:              ['total', 'total_atendimentos', 'qtd_total'],
  mes:                ['mes', 'month', 'periodo', 'competencia'],
  ano:                ['ano', 'year'],
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
  periodYear: number
): Promise<ResumoSuporte> {
  const resumo: ResumoSuporte = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
    categoriasResumo: [],
  };

  const registros: typeof supportRecords.$inferInsert[] = [];
  const problemas: Array<{ problemaReclamado: string }> = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const numLinha = i + 2;

    try {
      const atendente = trimOrNull(get(row, 'atendente'));
      if (!atendente) {
        resumo.erros.push({ linha: numLinha, erro: 'Campo "atendente" ausente' });
        resumo.totalInvalidas++;
        continue;
      }

      // Respeita mês/ano da linha se existir, senão usa o do lote
      const mesLinha = get(row, 'mes');
      const anoLinha = get(row, 'ano');
      const month = mesLinha ? toInt(mesLinha) || periodMonth : periodMonth;
      const year  = anoLinha ? toInt(anoLinha) || periodYear  : periodYear;

      registros.push({
        attendantName:  atendente,
        openedManutExt: toInt(get(row, 'aberturaManutExt')),
        percentage:     toDecimal(get(row, 'percentual')),
        withoutManut:   toInt(get(row, 'semManut')),
        total:          toInt(get(row, 'total')),
        periodMonth:    month,
        periodYear:     year,
      });

      // Coleta ProblemaReclamado para classificação (campo opcional)
      problemas.push({ problemaReclamado: get(row, 'problemaReclamado') });
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

  // ── Classificação automática por ProblemaReclamado ────────────────────────
  if (problemas.length) {
    const summary = buildSupportSummary(problemas);
    resumo.categoriasResumo = summary;

    if (summary.length) {
      await db
        .delete(supportCallCategories)
        .where(
          and(
            eq(supportCallCategories.periodMonth, periodMonth),
            eq(supportCallCategories.periodYear, periodYear)
          )
        );

      await db.insert(supportCallCategories).values(
        summary.map((item) => ({
          categoria:   item.tipo,
          quantidade:  item.quantidade,
          percentual:  String(item.percentual),
          periodMonth,
          periodYear,
        }))
      );
    }
  }

  return resumo;
}
