import { trimOrNull, parseBRDateWithTime, gerarHash, normalizeTechName, parseIntervalToSeconds } from './helpers';
import { calculateSLA } from '@/lib/sla/calculate-sla';
import { dentroSLA, slaMetaHoras } from './calcular-sla-bi';
import type { LinhaNormalizada } from '../validators/import-atendimento.schema';

// ── Normalização de tipo ──────────────────────────────────────────────────────

const TIPO_MAP: Record<string, string> = {
  // Formatos curtos vindos do sistema
  'nova':                          'Instalação (Nova)',
  'reativacao':                    'Instalação (Reativação)',
  'reativação':                    'Instalação (Reativação)',
  'reativacao login':              'Instalação (Reativação)',
  'reativação login':              'Instalação (Reativação)',
  'reativação de login':           'Instalação (Reativação)',
  'reativacao de login':           'Instalação (Reativação)',
  'reparo':                        'Reparo',
  'atendimento externo':           'Reparo',
  'manutencao':                    'Reparo',
  'manutenção':                    'Reparo',
  'mudanca de endereco':           'Mudança de Endereço',
  'mudança de endereço':           'Mudança de Endereço',
  'retirada de kit':               'Retirada de Kit',
  'retirada kit':                  'Retirada de Kit',
  'mudanca de plano':              'Mudança de Plano',
  'mudança de plano':              'Mudança de Plano',
  'retorno':                       'Retorno',
  'nova fibra':                     'Instalação (Nova)',
  'reativacao fibra':              'Instalação (Reativação)',
  'reativação fibra':              'Instalação (Reativação)',
  // Formatos já canônicos
  'instalação (nova)':             'Instalação (Nova)',
  'instalação (reativação)':       'Instalação (Reativação)',
  'instalação (reativacao)':       'Instalação (Reativação)',
  // Cancelados — aceita hífen (-) e travessão (–)
  'cancelado - reparo':            'Cancelado – Reparo',
  'cancelado – reparo':            'Cancelado – Reparo',
  'cancelado - retirada de kit':   'Cancelado – Retirada de Kit',
  'cancelado – retirada de kit':   'Cancelado – Retirada de Kit',
  'cancelado - mudança de endereço':'Cancelado – Mudança de Endereço',
  'cancelado – mudança de endereço':'Cancelado – Mudança de Endereço',
  'cancelado - mudanca de endereco':'Cancelado – Mudança de Endereço',
  'cancelado - retorno':           'Cancelado – Retorno',
  'cancelado – retorno':           'Cancelado – Retorno',
  'cancelado - reativação de login':'Cancelado – Reativação de Login',
  'cancelado – reativação de login':'Cancelado – Reativação de Login',
};

export function normalizarTipo(raw: string): { tipo: string; warning?: string } {
  const key = raw.trim().toLowerCase();
  const canonico = TIPO_MAP[key];
  if (canonico) return { tipo: canonico };

  // Não reconhecido: mantém o valor limpo e emite warning
  const tipoLimpo = raw.trim();
  return {
    tipo: tipoLimpo,
    warning: `Tipo desconhecido: "${tipoLimpo}" — mantido sem normalização`,
  };
}

// ── Mapeamento principal ──────────────────────────────────────────────────────

export interface MapeamentoResultado {
  dados: ReturnType<typeof mapearAtendimento>['dados'];
  warning?: string;
  erroFatal?: string;
}

export function mapearAtendimento(
  linha: LinhaNormalizada,
  loteId: number | null,
  tecnicoId: number | null,
  feriados: Set<string> = new Set()
): { dados: Record<string, unknown>; warning?: string } {
  const { tipo: tipoNorm, warning: tipoWarning } = normalizarTipo(linha.tipo);

  // Abertura (agora opcional)
  const aberturaAt = linha.dataAbertura 
    ? parseBRDateWithTime(linha.dataAbertura, linha.horaAbertura ?? '') 
    : null;

  // Finalização (opcional)
  const finalizacaoAt = linha.dataFinalizacao
    ? parseBRDateWithTime(linha.dataFinalizacao, linha.horaFinalizacao ?? '')
    : null;

  // SLA
  const metaHoras = slaMetaHoras(tipoNorm);

  let slaCorridoSeg: number | null = null;
  let slaUtilSeg: number | null = null;
  let dentroSlaCorrido: boolean | null = null;
  let dentroSlaUtil: boolean | null = null;

  if (aberturaAt && finalizacaoAt) {
    const calculado = calculateSLA(aberturaAt, finalizacaoAt, {
      holidayKeys: feriados,
    });
    slaCorridoSeg = calculado.slaCorridoSegundos;
    slaUtilSeg = calculado.slaUtilSegundos;
    dentroSlaCorrido = dentroSLA(slaCorridoSeg, metaHoras);
    dentroSlaUtil = dentroSLA(slaUtilSeg, metaHoras);
  } else if (linha.intervalo) {
    // Usa o campo Intervalo do CSV quando não há dataFinalizacao ou aberturaAt
    slaCorridoSeg = parseIntervalToSeconds(linha.intervalo);
    if (slaCorridoSeg !== null) {
      dentroSlaCorrido = dentroSLA(slaCorridoSeg, metaHoras);
    }
  }

  // Hash de deduplicação
  const hash = gerarHash({
    numeroOs:       linha.numeroOs ?? '',
    cliente:        linha.cliente ?? '',
    tipo:           tipoNorm,
    dataAbertura:   linha.dataAbertura ?? '',
    horaAbertura:   linha.horaAbertura ?? '',
    dataFinalizacao: linha.dataFinalizacao ?? '',
    horaFinalizacao: linha.horaFinalizacao ?? '',
    tecnico:        linha.tecnico ?? '',
    intervalo:      linha.intervalo ?? '',
  });

  const tecnicoNome = trimOrNull(linha.tecnico);
  const dataReferencia = finalizacaoAt ?? aberturaAt ?? new Date();

  const maxLen = (str: string | null | undefined, len: number) => 
    str ? str.slice(0, len) : null;

  const dados = {
    numeroOs:          maxLen(trimOrNull(linha.numeroOs), 50),
    tipo:              tipoNorm,
    motivo:            null, // campo não presente neste CSV
    solucao:           trimOrNull(linha.observacao), // text (sem limite)
    tecnico:           maxLen(tecnicoNome ? normalizeTechName(tecnicoNome) : null, 255),
    tecnicoId,
    cliente:           maxLen(trimOrNull(linha.cliente), 255),
    cidade:            maxLen(trimOrNull(linha.cidade), 100),
    plano:             maxLen(trimOrNull(linha.plano), 255),

    dataAbertura:      maxLen(trimOrNull(linha.dataAbertura), 10),
    horaAbertura:      maxLen(trimOrNull(linha.horaAbertura), 8),
    dataFinalizacao:   maxLen(trimOrNull(linha.dataFinalizacao), 10),
    horaFinalizacao:   maxLen(trimOrNull(linha.horaFinalizacao), 8),
    aberturaAt,
    finalizacaoAt,

    intervalo:         maxLen(trimOrNull(linha.intervalo), 50),
    slaHoras:          metaHoras !== null ? String(metaHoras) : null,
    dentroSla:         dentroSlaCorrido,
    slaCorridoSegundos: slaCorridoSeg,
    slaUtilSegundos:   slaUtilSeg,
    dentroSlaUtil,

    login:             maxLen(trimOrNull(linha.login), 100),
    endereco:          trimOrNull(linha.endereco), // text
    bairro:            maxLen(trimOrNull(linha.bairro), 100),
    referencia:        trimOrNull(linha.referencia), // text
    atendente:         maxLen(trimOrNull(linha.atendente), 255),
    indicacao:         maxLen(trimOrNull(linha.indicacao), 255),
    mac:               maxLen(trimOrNull(linha.mac), 20),
    ativo:             maxLen(trimOrNull(linha.ativo), 5),
    empresa:           maxLen(trimOrNull(linha.empresa), 255),
    dataLiberada:      maxLen(trimOrNull(linha.dataLiberada), 50),
    observacao:        trimOrNull(linha.observacao), // text
    coordenadas:       maxLen(trimOrNull(linha.coordenadas), 100),
    telefones:         maxLen(trimOrNull(linha.telefones), 255),
    agendamento:       maxLen(trimOrNull(linha.agendamento), 100),

    hashImportacao:    hash,
    loteImportacaoId:  loteId,
    periodMonth:       dataReferencia.getMonth() + 1,
    periodYear:        dataReferencia.getFullYear(),
  };

  return { dados, warning: tipoWarning };
}
