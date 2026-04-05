import { db } from '@/lib/db';
import { cancellationRecords } from '@/lib/db/schema';
import type { NewCancellationRecord } from '@/lib/db/schema';
import { normalizeHeader, parseBRDate, trimOrNull } from './helpers';

const ALIASES: Record<string, string[]> = {
  clientName: ['cliente', 'client_name', 'nome_cliente', 'nome', 'assinante', 'nome_assinante', 'razao_social'],
  city: ['cidade', 'city', 'cidade_uf', 'municipio', 'localidade', 'cidade_cliente'],
  reason: ['motivo', 'reason', 'motivo_cancelamento', 'cancelamento', 'status', 'situacao', 'causa', 'motivo_saida'],
  source: ['origem', 'source', 'indicacao', 'canal', 'origem_lead', 'origem_venda', 'canal_venda', 'midia'],
  plan: ['plano', 'plan', 'produto', 'pacote', 'combo', 'plano_contratado'],
  observation: ['observacao', 'obs', 'detalhe', 'comentario', 'descricao', 'observacoes', 'nota'],
  cancelledAt: [
    'datacancelamento',
    'data_cancelamento',
    'datapedido',
    'data_pedido',
    'data',
    'data_solicitacao',
    'data_saida',
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

  const registros: NewCancellationRecord[] = [];

  for (let index = 0; index < linhas.length; index++) {
    const row = linhas[index];
    const lineNumber = index + 2;

    try {
      const dateValue = get(row, 'cancelledAt');
      const cancelledAt = parseBRDate(dateValue) ?? new Date();
      const reason = trimOrNull(get(row, 'reason')) ?? trimOrNull(get(row, 'observation'));
      const observation = trimOrNull(get(row, 'observation'));

      registros.push({
        originSector: 'retencao',
        clientName:  trimOrNull(get(row, 'clientName')),
        city:        trimOrNull(get(row, 'city')),
        reason,
        source:      trimOrNull(get(row, 'source')),
        plan:        trimOrNull(get(row, 'plan')),
        observation,
        cancelledAt,
        periodMonth: cancelledAt.getMonth() + 1,
        periodYear:  cancelledAt.getFullYear(),
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
      const chunk = registros.slice(index, index + CHUNK);
      try {
        await db.insert(cancellationRecords).values(chunk);
        resumo.totalInseridas += chunk.length;
      } catch (err: unknown) {
        // Fallback: insere um a um
        for (const rec of chunk) {
          try {
            await db.insert(cancellationRecords).values(rec);
            resumo.totalInseridas++;
          } catch (itemErr: unknown) {
            resumo.totalInvalidas++;
            resumo.erros.push({ linha: -1, erro: `PostgreSQL Error: ${String(itemErr)}` });
          }
        }
      }
    }
  }

  return resumo;
}
