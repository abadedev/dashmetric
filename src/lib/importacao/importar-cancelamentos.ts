import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

const ALIASES: Record<string, string[]> = {
  clientName: ['cliente', 'client_name', 'nome_cliente', 'nome', 'assinante'],
  city: ['cidade', 'city', 'cidade_uf', 'municipio'],
  reason: ['motivo', 'reason', 'motivo_cancelamento', 'cancelamento', 'status', 'situacao'],
  source: ['origem', 'source', 'indicacao', 'canal', 'origem_lead', 'origem_venda'],
  plan: ['plano', 'plan', 'produto'],
  observation: ['observacao', 'obs', 'detalhe', 'comentario', 'descricao'],
  cancelledAt: [
    'datacancelamento',
    'data_cancelamento',
    'datapedido',
    'data_pedido',
    'data',
    'data_solicitacao',
  ],
};

function get(row: Record<string, string>, key: keyof typeof ALIASES) {
  const aliases = ALIASES[key];
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const found = Object.entries(row).find(([header]) => normalizeHeader(header) === normalized);
    if (found && found[1].trim() !== '') return found[1].trim();
  }
  return '';
}

export interface ResumoCancelamentos {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  erros: Array<{ linha: number; erro: string }>;
}

export async function importarCancelamentos(
  linhas: Record<string, string>[]
): Promise<ResumoCancelamentos> {
  const resumo: ResumoCancelamentos = {
    totalLidas: linhas.length,
    totalInseridas: 0,
    totalInvalidas: 0,
    erros: [],
  };

  const registros: typeof cancellationRecords.$inferInsert[] = [];

  for (let index = 0; index < linhas.length; index++) {
    const row = linhas[index];
    const lineNumber = index + 2;

    try {
      const dateValue = get(row, 'cancelledAt');
      const cancelledAt = parseBRDate(dateValue) ?? new Date();
      const reason = trimOrNull(get(row, 'reason')) ?? trimOrNull(get(row, 'observation'));
      const observation = trimOrNull(get(row, 'observation'));

      registros.push({
        clientName: trimOrNull(get(row, 'clientName')),
        city: trimOrNull(get(row, 'city')),
        reason,
        source: trimOrNull(get(row, 'source')),
        plan: trimOrNull(get(row, 'plan')),
        observation,
        cancelledAt,
        periodMonth: cancelledAt.getMonth() + 1,
        periodYear: cancelledAt.getFullYear(),
      });
    } catch (error) {
      resumo.totalInvalidas++;
      resumo.erros.push({
        linha: lineNumber,
        erro: String(error),
      });
    }
  }

  if (registros.length) {
    const CHUNK = 200;
    for (let index = 0; index < registros.length; index += CHUNK) {
      await db.insert(cancellationRecords).values(registros.slice(index, index + CHUNK));
    }
    resumo.totalInseridas = registros.length;
  }

  return resumo;
}

export async function importarCancelamentosDerivadosDeVendas(
  linhas: Record<string, string>[]
) {
  const rows = linhas.map((row) => ({
    cliente: row.Cliente ?? row.cliente ?? '',
    cidade: row.Cidade ?? row.cidade ?? '',
    observacao: row.Observacao ?? row.observacao ?? '',
    indicacao: row.Indicacao ?? row.indicacao ?? '',
    plano: row.Plano ?? row.plano ?? '',
    dataPedido: row.dataPedido ?? row.datapedido ?? row.DataPedido ?? '',
  }));

  return importarCancelamentos(rows as unknown as Record<string, string>[]);
}
