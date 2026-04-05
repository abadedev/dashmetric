import { db } from '@/lib/db';
import { importarAtendimentos } from '@/lib/importacao/importar-atendimentos';
import { importarCancelamentos } from '@/lib/importacao/importar-cancelamentos';
import { importarInfraestrutura } from '@/lib/importacao/importar-infraestrutura';
import {
  importarQualidade,
  inferirPeriodosQualidade,
  limparQualidadePorPeriodos,
} from '@/lib/importacao/importar-qualidade';
import { importarSuporte } from '@/lib/importacao/importar-suporte';
import { importarVendas } from '@/lib/importacao/importar-vendas';

export type SystemModuleKey =
  | 'atendimentos'
  | 'qualidade'
  | 'suporte'
  | 'vendas'
  | 'cancelamentos'
  | 'infraestrutura';

export type ModuleFilterField = {
  key: string;
  label: string;
  queryParam: string;
  type: 'text' | 'search' | 'enum';
  description: string;
  placeholder?: string;
};

export type ModuleFilterDefinition = {
  title: string;
  description: string;
  fields: ModuleFilterField[];
};

export type ModuleImportContext = {
  fileName: string;
  buffer: Buffer;
  rows: Record<string, string>[];
  reimportarQualidade: boolean;
};

export type ModuleImportResponse = {
  success: true;
  tipoPlanilha: SystemModuleKey;
  message: string;
} & Record<string, unknown>;

export type ModuleRegistryEntry = {
  key: SystemModuleKey;
  title: string;
  importMessage: string;
  filters?: ModuleFilterDefinition;
  importHandler: (context: ModuleImportContext) => Promise<ModuleImportResponse>;
};

async function importQualityModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  let reimportacao: { periodos: string[]; registrosRemovidos: number } | undefined;
  let resumo;

  if (context.reimportarQualidade) {
    const periodos = inferirPeriodosQualidade(context.rows);

    if (periodos.length === 0) {
      throw new Error('Nao foi possivel inferir os periodos da planilha de qualidade para reimportacao segura.');
    }

    const transactional = await db.transaction(async (tx) => {
      const txExecutor = tx as unknown as typeof db;
      const registrosRemovidos = await limparQualidadePorPeriodos(periodos, txExecutor);
      const resumoTx = await importarQualidade(context.rows, txExecutor);

      return { registrosRemovidos, resumoTx };
    });

    reimportacao = {
      periodos: periodos.map((p) => `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`),
      registrosRemovidos: transactional.registrosRemovidos,
    };
    resumo = transactional.resumoTx;
  } else {
    resumo = await importarQualidade(context.rows);
  }

  return {
    success: true,
    tipoPlanilha: 'qualidade',
    message: 'Importacao de Qualidade concluida',
    resumo,
    reimportacao,
  };
}

async function importSupportModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const now = new Date();
  const resumo = await importarSuporte(context.rows, now.getMonth() + 1, now.getFullYear());

  return {
    success: true,
    tipoPlanilha: 'suporte',
    message: 'Importacao de Suporte Tecnico concluida',
    resumo,
  };
}

async function importSalesModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarVendas(context.rows, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'vendas',
    message: 'Importacao de Vendas concluida',
    resumo,
  };
}

async function importCancellationsModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarCancelamentos(context.rows);

  return {
    success: true,
    tipoPlanilha: 'cancelamentos',
    message: 'Importacao de Cancelamentos concluida',
    resumo,
  };
}

async function importInfrastructureModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarInfraestrutura(context.rows);

  return {
    success: true,
    tipoPlanilha: 'infraestrutura',
    message: 'Importacao de Infraestrutura concluida',
    resumo,
  };
}

async function importAttendancesModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const { loteId, resumo } = await importarAtendimentos(context.buffer, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'atendimentos',
    message: 'Importacao de Atendimentos concluida',
    loteId,
    resumo,
  };
}

export const MODULE_REGISTRY: Record<SystemModuleKey, ModuleRegistryEntry> = {
  atendimentos: {
    key: 'atendimentos',
    title: 'Atendimentos',
    importMessage: 'Importacao de Atendimentos concluida',
    filters: {
      title: 'Atendimentos',
      description: 'Filtros operacionais para ordens de servico e instalacoes.',
      fields: [
        { key: 'search', label: 'Busca geral', queryParam: 'search', type: 'search', description: 'Busca por OS, cliente, endereco, bairro, plano ou telefone.', placeholder: 'OS, cliente, endereco ou telefone' },
        { key: 'type', label: 'Tipo', queryParam: 'type', type: 'enum', description: 'Tipo de atividade da OS.' },
        { key: 'city', label: 'Cidade', queryParam: 'city', type: 'text', description: 'Cidade do atendimento.' },
        { key: 'plan', label: 'Plano', queryParam: 'plan', type: 'text', description: 'Plano vinculado a OS.' },
        { key: 'bairro', label: 'Bairro', queryParam: 'bairro', type: 'text', description: 'Bairro do atendimento.' },
        { key: 'source', label: 'Origem', queryParam: 'source', type: 'text', description: 'Indicacao ou origem associada a OS.' },
      ],
    },
    importHandler: importAttendancesModule,
  },
  qualidade: {
    key: 'qualidade',
    title: 'Qualidade',
    importMessage: 'Importacao de Qualidade concluida',
    filters: {
      title: 'Qualidade',
      description: 'Filtros para retrabalho, indicadores e reclamacoes tecnicas.',
      fields: [
        { key: 'search', label: 'Busca geral', queryParam: 'search', type: 'search', description: 'Busca por OS, cliente, tecnico, motivo, solucao ou plano.', placeholder: 'OS, cliente, tecnico ou motivo' },
        { key: 'type', label: 'Indicador', queryParam: 'type', type: 'enum', description: 'Indicador de qualidade.' },
        { key: 'city', label: 'Cidade', queryParam: 'city', type: 'text', description: 'Cidade do registro.' },
        { key: 'plan', label: 'Plano', queryParam: 'plan', type: 'text', description: 'Plano associado ao atendimento.' },
      ],
    },
    importHandler: importQualityModule,
  },
  suporte: {
    key: 'suporte',
    title: 'Suporte',
    importMessage: 'Importacao de Suporte Tecnico concluida',
    importHandler: importSupportModule,
  },
  vendas: {
    key: 'vendas',
    title: 'Vendas',
    importMessage: 'Importacao de Vendas concluida',
    filters: {
      title: 'Vendas',
      description: 'Filtros comerciais para negociacoes, fechamentos e instalacoes.',
      fields: [
        { key: 'search', label: 'Busca geral', queryParam: 'search', type: 'search', description: 'Busca por cliente, plano, indicacao ou observacao.', placeholder: 'Cliente, plano ou observacao' },
        { key: 'type', label: 'Tipo', queryParam: 'type', type: 'enum', description: 'Tipo do registro comercial.' },
        { key: 'city', label: 'Cidade', queryParam: 'city', type: 'text', description: 'Cidade da venda.' },
        { key: 'plan', label: 'Plano', queryParam: 'plan', type: 'text', description: 'Plano negociado.' },
        { key: 'source', label: 'Origem', queryParam: 'source', type: 'text', description: 'Origem comercial do lead ou venda.' },
      ],
    },
    importHandler: importSalesModule,
  },
  cancelamentos: {
    key: 'cancelamentos',
    title: 'Cancelamentos',
    importMessage: 'Importacao de Cancelamentos concluida',
    filters: {
      title: 'Cancelamentos',
      description: 'Filtros de retencao por cidade, plano, origem e motivo.',
      fields: [
        { key: 'search', label: 'Busca geral', queryParam: 'search', type: 'search', description: 'Busca por cliente, motivo, observacao ou plano.', placeholder: 'Cliente, motivo ou observacao' },
        { key: 'category', label: 'Motivo', queryParam: 'category', type: 'enum', description: 'Motivo consolidado do cancelamento.' },
        { key: 'city', label: 'Cidade', queryParam: 'city', type: 'text', description: 'Cidade do cliente.' },
        { key: 'plan', label: 'Plano', queryParam: 'plan', type: 'text', description: 'Plano cancelado.' },
        { key: 'source', label: 'Origem', queryParam: 'source', type: 'text', description: 'Origem do cliente ou canal associado.' },
      ],
    },
    importHandler: importCancellationsModule,
  },
  infraestrutura: {
    key: 'infraestrutura',
    title: 'Infraestrutura',
    importMessage: 'Importacao de Infraestrutura concluida',
    importHandler: importInfrastructureModule,
  },
};

export const MODULE_REGISTRY_KEYS = Object.keys(MODULE_REGISTRY) as SystemModuleKey[];

export function isSystemModuleKey(value: string | null | undefined): value is SystemModuleKey {
  return Boolean(value && MODULE_REGISTRY_KEYS.includes(value as SystemModuleKey));
}

export function getModuleRegistryEntry(key: SystemModuleKey) {
  return MODULE_REGISTRY[key];
}
