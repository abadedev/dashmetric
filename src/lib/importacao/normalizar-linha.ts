import { trimOrNull } from './helpers';

/** Retorna '' quando o valor é um erro de fórmula Excel (#REF!, #VALUE!, etc.) */
function sanitizeExcelError(v: string): string {
  return /^#(REF!|VALUE!|N\/A|DIV\/0!|NUM!|NAME\?|NULL!)/i.test(v.trim()) ? '' : v;
}

/**
 * Mapa de aliases: chave canônica → possíveis nomes de header no arquivo
 * (já normalizados por normalizeHeader, portanto lowercase sem acento).
 */
const ALIASES: Record<string, string[]> = {
  numeroOs:       ['#', 'n_os', 'numero_os', 'numeroos', 'os', 'numero'],
  dataPedido:     ['datapedido', 'data_pedido', 'dataabertura', 'data_abertura'],
  agendamento:    ['agendamento'],
  tipo:           ['tipo'],
  intervalo:      ['intervalo'],
  dataInstalacao: ['datainstalacao', 'data_instalacao'],
  horaInicio:     ['horainicio', 'hora_inicio', 'horaabertura', 'hora_abertura'],
  horaSaida:      ['horasaida', 'hora_saida', 'horafinalizacao', 'hora_finalizacao', 'horafechamento', 'hora_fechamento'],
  dataFinalizacao:['datafinalizacao', 'data_finalizacao', 'datafinal', 'data_final', 'datafechamento', 'data_fechamento', 'fechamento'],
  instalador:     ['instalador', 'tecnico', 'tecnico_nome', 'technician'],
  login:          ['login'],
  cliente:        ['cliente'],
  endereco:       ['endereco'],
  bairro:         ['bairro'],
  cidade:         ['cidade'],
  referencia:     ['referencia'],
  atendente:      ['atendente'],
  indicacao:      ['indicacao'],
  mac:            ['mac'],
  ativo:          ['ativo'],
  empresa:        ['empresa'],
  dataLiberada:   ['dataliberada', 'data_liberada'],
  observacao:     ['observacao', 'solucao'],
  coordenadas:    ['coordenadas'],
  plano:          ['plano'],
  telefones:      ['telefones'],
};

/** Extrai o valor de uma linha bruta dado um alias canônico */
function get(row: Record<string, string>, key: string): string {
  const aliases = ALIASES[key] ?? [key];
  for (const alias of aliases) {
    if (alias in row && row[alias].trim() !== '') return row[alias].trim();
  }
  return '';
}

/**
 * Converte uma linha bruta (saída do parser) para a estrutura
 * normalizada esperada pelo mapeador e validador.
 */
export function normalizarLinha(row: Record<string, string>): Record<string, string> {
  const dataPedido = sanitizeExcelError(get(row, 'dataPedido'));
  const dataFinalizacao = sanitizeExcelError(get(row, 'dataFinalizacao'));

  // dataPedido pode vir como "DD/MM/YY - HH:MM" (combinado) ou só data
  const aberturaSplit = splitCombinado(dataPedido);
  const finalizacaoSplit = splitCombinado(dataFinalizacao);

  return {
    numeroOs:       get(row, 'numeroOs'),
    agendamento:    get(row, 'agendamento'),
    tipo:           get(row, 'tipo'),
    intervalo:      get(row, 'intervalo'),
    dataAbertura:   aberturaSplit.data,
    horaAbertura:   aberturaSplit.hora || get(row, 'horaInicio'),
    dataFinalizacao: finalizacaoSplit.data,
    horaFinalizacao: finalizacaoSplit.hora || get(row, 'horaSaida'),
    tecnico:        get(row, 'instalador'),
    login:          get(row, 'login'),
    cliente:        trimOrNull(get(row, 'cliente')) ?? '',
    endereco:       get(row, 'endereco'),
    bairro:         get(row, 'bairro'),
    cidade:         get(row, 'cidade'),
    referencia:     get(row, 'referencia'),
    atendente:      get(row, 'atendente'),
    indicacao:      get(row, 'indicacao'),
    mac:            get(row, 'mac'),
    ativo:          get(row, 'ativo'),
    empresa:        get(row, 'empresa'),
    dataLiberada:   get(row, 'dataLiberada'),
    observacao:     get(row, 'observacao'),
    coordenadas:    get(row, 'coordenadas'),
    plano:          get(row, 'plano'),
    telefones:      get(row, 'telefones'),
  };
}

function splitCombinado(value: string): { data: string; hora: string } {
  const v = value.trim();

  // Formato padrão: "20/03/26 - 15:58"
  const dashIdx = v.indexOf(' - ');
  if (dashIdx !== -1) {
    return { data: v.slice(0, dashIdx).trim(), hora: v.slice(dashIdx + 3).trim() };
  }

  // Datas relativas: "Hoje 08:21", "Ontem 14:30", "Anteontem 11:22"
  const relMatch = v.match(/^(hoje|ontem|anteontem)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/i);
  if (relMatch) {
    return { data: relMatch[1], hora: relMatch[2] };
  }

  return { data: v, hora: '' };
}
