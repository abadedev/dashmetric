import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { and, gte, lte } from 'drizzle-orm';

// ── Keywords que identificam mudança de plano na observação ──────────────────

const KEYWORDS_MUDANCA_PLANO = [
  'ajuste de plano',
  'downgrade',
  'downgrade de plano',
  'listagem de onus',
  'listagem geral de onus',
  'listagem de onu',
  'listagem geral de onu',
  'cliente migrou',
  'migrou de plano',
  'migrou para um plano',
  'migrou para',
  'alterou de plano',
  'alterou o plano',
  'trocou para',
  'troca para os planos',
  'plano correto',
  'estava pendente alterar o plano',
  'plano nao foi ajustado',
  'favor resolverem o plano',
  'ajuste da planilha de onus',
  'cliente com atendimento em aberto',
  'termo e documento recebido',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizar(str: string): string {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function temKeywordMudancaPlano(row: Record<string, string>): boolean {
  // Headers já normalizados pelo parseCsv (lowercase, sem acento, snake_case)
  const camposObservacao = ['observacao', 'obs', 'motivo', 'causa', 'solucao', 'problemareclamado'];
  const texto = camposObservacao.map((c) => normalizar(row[c] ?? '')).join(' ');
  return KEYWORDS_MUDANCA_PLANO.some((kw) => texto.includes(normalizar(kw)));
}

function normalizarNomeCliente(nome: string): string {
  return normalizar(nome).replace(/\s+/g, ' ').trim();
}

// Converte "DD/MM/YY - HH:MM" → Date (retorna null se inválido)
function parseBRDateLoose(valor: string): Date | null {
  if (!valor) return null;
  const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  return new Date(year, Number(m) - 1, Number(d));
}

// ── Resultado do pré-processamento ───────────────────────────────────────────

export interface ResultadoPreProcessamento {
  linhasParaImportar: Record<string, string>[];
  totalCanceladasMudancaPlano: number;
  totalCruzadas: number;
  semCruzamento: string[];
}

// ── Função principal ─────────────────────────────────────────────────────────

export async function processarCanceladasMudancaPlano(
  linhasBrutas: Record<string, string>[]
): Promise<ResultadoPreProcessamento> {
  const candidatas = linhasBrutas.filter(temKeywordMudancaPlano);

  const semCruzamento: string[] = [];
  const linhasParaImportar: Record<string, string>[] = [];

  if (candidatas.length === 0) {
    return {
      linhasParaImportar: [],
      totalCanceladasMudancaPlano: 0,
      totalCruzadas: 0,
      semCruzamento: [],
    };
  }

  let totalCruzadas = 0;

  for (const row of candidatas) {
    const nomeCliente = (row['cliente'] ?? '').trim();

    const dataAberturaRaw = row['dataabertura'] ?? '';
    const dataRef = parseBRDateLoose(dataAberturaRaw);

    let atendimentoCruzado: {
      tecnico: string | null;
      dataAbertura: string | null;
      horaAbertura: string | null;
      dataFinalizacao: string | null;
      horaFinalizacao: string | null;
      numeroOs: string | null;
      plano: string | null;
      cidade: string | null;
      intervalo: string | null;
      login: string | null;
    } | null = null;

    try {
      const whereConditions = dataRef
        ? and(
            gte(atendimentos.aberturaAt, new Date(dataRef.getTime() - 60 * 24 * 3600 * 1000)),
            lte(atendimentos.aberturaAt, new Date(dataRef.getTime() + 60 * 24 * 3600 * 1000))
          )
        : undefined;

      const registros = await db
        .select({
          tecnico: atendimentos.tecnico,
          dataAbertura: atendimentos.dataAbertura,
          horaAbertura: atendimentos.horaAbertura,
          dataFinalizacao: atendimentos.dataFinalizacao,
          horaFinalizacao: atendimentos.horaFinalizacao,
          numeroOs: atendimentos.numeroOs,
          plano: atendimentos.plano,
          cidade: atendimentos.cidade,
          login: atendimentos.login,
          intervalo: atendimentos.intervalo,
        })
        .from(atendimentos)
        .where(whereConditions)
        .limit(50);

      const correspondente = registros[0] ?? null;

      if (correspondente) {
        atendimentoCruzado = correspondente;
        totalCruzadas++;
      }
    } catch {
      // Falha silenciosa — importa com dados da cancelada mesmo assim
    }

    const linhaImportar: Record<string, string> = {
      Tipo: 'Mudança de Plano',
      '#': String(row['os'] ?? row['#'] ?? ''),
      Cliente: nomeCliente,
      Cidade: atendimentoCruzado?.cidade ?? row['cidade'] ?? '',
      Endereco: row['endereco'] ?? '',
      Bairro: row['bairro'] ?? '',
      Plano: atendimentoCruzado?.plano ?? row['plano'] ?? '',
      Telefones: row['telefones'] ?? '',
      Tecnico: atendimentoCruzado?.tecnico ?? row['tecnico'] ?? '',
      Login: atendimentoCruzado?.login ?? row['login'] ?? '',
      dataAbertura: atendimentoCruzado?.dataAbertura ?? row['dataabertura'] ?? '',
      horaInicio: atendimentoCruzado?.horaAbertura ?? row['horainicio'] ?? '',
      dataFinalizacao: atendimentoCruzado?.dataFinalizacao ?? row['datafinalizacao'] ?? '',
      horaSaida: atendimentoCruzado?.horaFinalizacao ?? row['horasaida'] ?? '',
      Intervalo: atendimentoCruzado?.intervalo ?? row['intervalo'] ?? '',
      Empresa: row['empresa'] ?? '',
      Observacao: row['observacao'] ?? '',
    };

    if (!atendimentoCruzado) {
      semCruzamento.push(nomeCliente);
    }

    linhasParaImportar.push(linhaImportar);
  }

  return {
    linhasParaImportar,
    totalCanceladasMudancaPlano: candidatas.length,
    totalCruzadas,
    semCruzamento,
  };
}

/**
 * Versão sem banco — cruza canceladas com finalizadas enviadas juntas.
 */
export function cruzarCanceladasComFinalizadas(
  linhasCanceladas: Record<string, string>[],
  linhasFinalizadas: Record<string, string>[]
): ResultadoPreProcessamento {
  const candidatas = linhasCanceladas.filter(temKeywordMudancaPlano);

  const indiceFin = new Map<string, Record<string, string>[]>();
  for (const row of linhasFinalizadas) {
    const key = normalizarNomeCliente(row['cliente'] ?? '');
    if (!indiceFin.has(key)) indiceFin.set(key, []);
    indiceFin.get(key)!.push(row);
  }

  const semCruzamento: string[] = [];
  const linhasParaImportar: Record<string, string>[] = [];
  let totalCruzadas = 0;

  for (const rowC of candidatas) {
    const nomeCliente = (rowC['cliente'] ?? '').trim();
    const key = normalizarNomeCliente(nomeCliente);
    const finalizadas = indiceFin.get(key);
    const rowF = finalizadas?.[0] ?? null;

    if (rowF) totalCruzadas++;
    else semCruzamento.push(nomeCliente);

    linhasParaImportar.push({
      Tipo: 'Mudança de Plano',
      '#': String(rowC['os'] ?? rowC['#'] ?? ''),
      Cliente: nomeCliente,
      Cidade: rowF?.['cidade'] ?? rowC['cidade'] ?? '',
      Endereco: rowF?.['endereco'] ?? rowC['endereco'] ?? '',
      Bairro: rowF?.['bairro'] ?? rowC['bairro'] ?? '',
      Plano: rowF?.['plano'] ?? rowC['plano'] ?? '',
      Telefones: rowF?.['telefones'] ?? rowC['telefones'] ?? '',
      Tecnico: rowF?.['tecnico'] ?? rowC['tecnico'] ?? '',
      Login: rowF?.['login'] ?? rowC['login'] ?? '',
      dataAbertura: rowF?.['dataabertura'] ?? rowC['dataabertura'] ?? '',
      horaInicio: rowF?.['horainicio'] ?? rowC['horainicio'] ?? '',
      dataFinalizacao: rowF?.['datafinalizacao'] ?? rowC['datafinalizacao'] ?? '',
      horaSaida: rowF?.['horasaida'] ?? rowC['horasaida'] ?? '',
      Intervalo: rowF?.['intervalo'] ?? rowC['intervalo'] ?? '',
      Empresa: rowC['empresa'] ?? '',
      Observacao: rowC['observacao'] ?? '',
    });
  }

  return {
    linhasParaImportar,
    totalCanceladasMudancaPlano: candidatas.length,
    totalCruzadas,
    semCruzamento,
  };
}
