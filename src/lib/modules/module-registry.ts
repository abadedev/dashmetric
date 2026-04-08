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
import { importarCRM } from '@/lib/importacao/importar-crm';
import { processarCanceladasMudancaPlano } from '@/lib/importacao/processar-canceladas-mudanca-plano';
import { processarInviabilidadeICT } from '@/lib/importacao/processar-inviabilidade-ict';
import { importarOmnichannel } from '@/lib/importacao/importar-omnichannel';
import { importarOmnichannelVendas } from '@/lib/importacao/importar-omnichannel-vendas';
import { importarIndiqueUmAmigo } from '@/lib/importacao/importar-indique-um-amigo';

export type SystemModuleKey =
  | 'atendimentos'
  | 'qualidade'
  | 'suporte'
  | 'crm'
  | 'vendas'
  | 'cancelamentos'
  | 'infraestrutura'
  | 'canceladas_mudanca_plano'
  | 'inviabilidade_ict'
  | 'omnichannel_matrix_go'
  | 'omnichannel_omni_vendas'
  | 'indique_um_amigo';

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
  workspaceId: string;
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
      const registrosRemovidos = await limparQualidadePorPeriodos(periodos, context.workspaceId, txExecutor);
      const resumoTx = await importarQualidade(context.rows, context.workspaceId, txExecutor);

      return { registrosRemovidos, resumoTx };
    });

    reimportacao = {
      periodos: periodos.map((p) => `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`),
      registrosRemovidos: transactional.registrosRemovidos,
    };
    resumo = transactional.resumoTx;
  } else {
    resumo = await importarQualidade(context.rows, context.workspaceId);
  }

  return {
    success: true,
    tipoPlanilha: 'qualidade',
    message: 'Importacao de Qualidade concluida',
    resumo,
    reimportacao,
  };
}

function detectSupportPeriod(rows: Record<string, string>[]): { month: number; year: number } {
  const now = new Date();
  const fallback = { month: now.getMonth() + 1, year: now.getFullYear() };
  const firstRow = rows[0];
  if (!firstRow) return fallback;

  const combinedDate =
    firstRow['data_abertura'] ??
    firstRow['dataabertura'] ??
    firstRow['data_pedido'] ??
    firstRow['datapedido'] ??
    firstRow['data_finalizacao'] ??
    firstRow['datafinalizacao'] ??
    '';
  const dateMatch = String(combinedDate).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const month = parseInt(dateMatch[2], 10);
    const rawYear = parseInt(dateMatch[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    if (month >= 1 && month <= 12 && year >= 2000) {
      return { month, year };
    }
  }

  const mes = firstRow['mes'] ?? firstRow['month'] ?? firstRow['periodo'] ?? firstRow['competencia'] ?? '';
  const ano = firstRow['ano'] ?? firstRow['year'] ?? '';
  const month = parseInt(mes.replace(/\D/g, ''), 10);
  const year  = parseInt(ano.replace(/\D/g, ''), 10);

  return {
    month: month >= 1 && month <= 12 ? month : fallback.month,
    year:  year  >= 2000              ? year  : fallback.year,
  };
}

async function importSupportModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const { month, year } = detectSupportPeriod(context.rows);
  const resumo = await importarSuporte(context.rows, month, year, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'suporte',
    message: 'Importacao de Suporte Tecnico concluida',
    resumo,
  };
}

async function importSalesModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarVendas(context.rows, context.workspaceId, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'vendas',
    message: 'Importacao de Vendas concluida',
    resumo,
  };
}

async function importCrmModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarCRM(context.rows, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'crm',
    message: 'Importacao de CRM concluida',
    resumo,
  };
}

async function importCancellationsModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarCancelamentos(context.rows, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'cancelamentos',
    message: 'Importacao de Cancelamentos concluida',
    resumo,
  };
}

async function importInfrastructureModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarInfraestrutura(context.rows, context.workspaceId, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'infraestrutura',
    message: 'Importacao de Infraestrutura concluida',
    resumo,
  };
}

async function importAttendancesModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const { loteId, resumo } = await importarAtendimentos(context.buffer, context.fileName, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'atendimentos',
    message: 'Importacao de Atendimentos concluida',
    loteId,
    resumo,
  };
}

function gerarCsvDasLinhas(linhas: Record<string, string>[]): string {
  if (linhas.length === 0) return '';
  const headers = Object.keys(linhas[0]);
  const escapar = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  };
  const linhasStr = linhas.map((row) => headers.map((h) => escapar(row[h] ?? '')).join(','));
  return '\uFEFF' + headers.join(',') + '\n' + linhasStr.join('\n');
}

async function importInviabilidadeICTModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const { linhasParaImportar, totalLidas, totalICT, totalIgnoradas } =
    processarInviabilidadeICT(context.rows);

  if (linhasParaImportar.length === 0) {
    return {
      success: true,
      tipoPlanilha: 'inviabilidade_ict',
      message: 'Nenhuma linha de ICT identificada (coluna "inviabilidade técnica" sem "x").',
      resumo: { totalLidas, totalInseridas: 0, totalInvalidas: 0 },
      preProcessamento: { totalLidas, totalICT: 0, totalIgnoradas },
    };
  }

  const resumo = await importarQualidade(linhasParaImportar, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'inviabilidade_ict',
    message: `ICT importado: ${totalICT} registro(s) de inviabilidade técnica.`,
    resumo,
    preProcessamento: { totalLidas, totalICT, totalIgnoradas },
  };
}

async function importCanceladasMudancaPlanoModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const { linhasParaImportar, totalCanceladasMudancaPlano, totalCruzadas, semCruzamento } =
    await processarCanceladasMudancaPlano(context.rows);

  if (linhasParaImportar.length === 0) {
    return {
      success: true,
      tipoPlanilha: 'canceladas_mudanca_plano',
      message: 'Nenhuma mudança de plano identificada nas canceladas.',
      resumo: { totalLidas: context.rows.length, totalInseridas: 0, totalInvalidas: 0 },
      preProcessamento: {
        totalCanceladasMudancaPlano: 0,
        totalCruzadas: 0,
        semCruzamento: [],
      },
    };
  }

  const csvGerado = gerarCsvDasLinhas(linhasParaImportar);
  const bufferGerado = Buffer.from(csvGerado, 'utf-8');
  const { loteId, resumo: resumoAtend } = await importarAtendimentos(bufferGerado, 'mudancas_plano_gerado.csv', context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'canceladas_mudanca_plano',
    message: 'Mudanças de plano extraídas e importadas com sucesso.',
    loteId,
    resumo: {
      totalLidas: resumoAtend.totalLidas,
      totalInseridas: resumoAtend.totalInseridas,
      totalInvalidas: resumoAtend.totalLidas - (resumoAtend.totalValidas ?? resumoAtend.totalInseridas),
      totalValidas: resumoAtend.totalValidas,
      totalDuplicadas: resumoAtend.totalDuplicadas,
    },
    preProcessamento: {
      totalCanceladasMudancaPlano,
      totalCruzadas,
      semCruzamento,
    },
  };
}

async function importOmnichannelModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarOmnichannel(context.rows, context.workspaceId, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'omnichannel_matrix_go',
    message: `Matrix Go importado: ${resumo.totalInseridas} registro(s) de Omnichannel.`,
    resumo,
  };
}

async function importOmnichannelVendasModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarOmnichannelVendas(context.rows, context.workspaceId, context.fileName);

  return {
    success: true,
    tipoPlanilha: 'omnichannel_omni_vendas',
    message: `Omni Vendas importado: ${resumo.agentesProcessados} agente(s), ${resumo.totalLidas} atendimento(s).`,
    resumo,
  };
}

async function importIndiqueUmAmigoModule(context: ModuleImportContext): Promise<ModuleImportResponse> {
  const resumo = await importarIndiqueUmAmigo(context.rows, context.workspaceId);

  return {
    success: true,
    tipoPlanilha: 'indique_um_amigo',
    message: `Indique um Amigo importado: ${resumo.totalInseridas} indicação(ões).`,
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
  crm: {
    key: 'crm',
    title: 'CRM',
    importMessage: 'Importacao de CRM concluida',
    importHandler: importCrmModule,
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
  canceladas_mudanca_plano: {
    key: 'canceladas_mudanca_plano',
    title: 'Canceladas (Mudança de Plano)',
    importMessage: 'Mudanças de plano extraídas e importadas com sucesso.',
    importHandler: importCanceladasMudancaPlanoModule,
  },
  inviabilidade_ict: {
    key: 'inviabilidade_ict',
    title: 'Inviabilidade Técnica (ICT)',
    importMessage: 'ICT importado com sucesso.',
    importHandler: importInviabilidadeICTModule,
  },
  omnichannel_matrix_go: {
    key: 'omnichannel_matrix_go',
    title: 'Matrix Go (Omnichannel)',
    importMessage: 'Importação Matrix Go concluída.',
    importHandler: importOmnichannelModule,
  },
  omnichannel_omni_vendas: {
    key: 'omnichannel_omni_vendas',
    title: 'Omni Vendas (Atendimentos)',
    importMessage: 'Importação Omni Vendas concluída.',
    importHandler: importOmnichannelVendasModule,
  },
  indique_um_amigo: {
    key: 'indique_um_amigo',
    title: 'Indique um Amigo',
    importMessage: 'Importação Indique um Amigo concluída.',
    importHandler: importIndiqueUmAmigoModule,
  },
};

export const MODULE_REGISTRY_KEYS = Object.keys(MODULE_REGISTRY) as SystemModuleKey[];

export function isSystemModuleKey(value: string | null | undefined): value is SystemModuleKey {
  return Boolean(value && MODULE_REGISTRY_KEYS.includes(value as SystemModuleKey));
}

export function getModuleRegistryEntry(key: SystemModuleKey) {
  return MODULE_REGISTRY[key];
}
