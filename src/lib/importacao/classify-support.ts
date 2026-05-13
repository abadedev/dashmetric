export type SupportCategoryItem = {
  tipo: string;
  quantidade: number;
  percentual: number;
};

export const SUPPORT_CATEGORIES = {
  // ── Técnico: Não Conecta ──────────────────────────────────────────────────
  NAO_CONECTA_LOS_PON:     'Não Conecta — LOS / PON piscando',
  NAO_CONECTA_SEM_SINAL:   'Não Conecta — Sem sinal / LEDs apagados na ONU',
  NAO_CONECTA_DROP:        'Não Conecta — Drop rompido / fibra física',
  NAO_CONECTA_LINK:        'Não Conecta — Rede / Link da operadora',

  // ── Técnico: Não Navega ───────────────────────────────────────────────────
  NAO_NAVEGA_IP:           'Não Navega — IP travado / sem autenticação',
  NAO_NAVEGA_ONU_TRAVADA:  'Não Navega — ONU travada / reinício necessário',
  NAO_NAVEGA_GERAL:        'Não Navega — Geral (sem causa específica)',
  NAO_NAVEGA_LINK:         'Não Navega — Rede / Link da operadora',

  // ── Técnico: Lentidão e Instabilidade ────────────────────────────────────
  LENTIDAO:                'Lentidão / Internet lenta',
  LENTIDAO_LINK:           'Lentidão — Rede / Link da operadora',
  INTERMITENCIA:           'Intermitência / Conexão caindo',

  // ── Técnico: Wi-Fi ────────────────────────────────────────────────────────
  WIFI_SENHA:              'Wi-Fi — Troca de nome / senha',
  WIFI_SINAL_FRACO:        'Wi-Fi — Sinal fraco / não aparece',

  // ── Técnico: Equipamentos ─────────────────────────────────────────────────
  TROCA_ONU:               'Troca / Substituição de ONU',
  ROTEADOR:                'Roteador — Reconfiguração ou particular',
  MUDANCA_COMODO:          'Mudança de cômodo / Novo ponto de rede',

  // ── Técnico: TV / IPTV ───────────────────────────────────────────────────
  TV_IPTV:                 'TV / TVBOX / IPTV com problema',

  // ── Técnico: Outros técnicos ─────────────────────────────────────────────
  PING_JOGO:               'Ping alto / Lag em jogos',
  CORRECAO_SINAL:          'Correção de sinal / Atendimento externo técnico',

  // ── Comercial / Financeiro ────────────────────────────────────────────────
  BLOQUEIO_SUSPENSAO:      'Bloqueio / Suspensão de contrato',
  BOLETO_FINANCEIRO:       'Boleto / Fatura / Financeiro',
  DSTECH_PLAY:             'DSTech Play — Acesso, dados ou senha',
  CANCELAMENTO:            'Cancelamento / Possível cancelamento',
  MUDANCA_PLANO:           'Mudança de plano',
  MUDANCA_TITULARIDADE:    'Mudança de titularidade',
  MUDANCA_ENDERECO:        'Mudança de endereço',
  REATIVACAO:              'Reativação de contrato',

  // ── Administrativo ────────────────────────────────────────────────────────
  CONTATO_SEM_PROBLEMA:    'Contato / Sem problema identificado',
  OUTROS:                  'Outros',
} as const;

export function normalizeText(value: string) {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function classifySupportRecord(problemaReclamado: string) {
  const text = normalizeText(problemaReclamado ?? '');
  if (!text) return SUPPORT_CATEGORIES.OUTROS;

  const hasAny = (...ps: RegExp[]) => ps.some((p) => p.test(text));

  const isLink = hasAny(/\blink\b/, /operadora/, /rede\s*externa/, /link\s*externo/, /link\s*down/, /link\s*fora/);
  const isSlow = hasAny(/lentidao/, /\blento\b/, /\blenta\b/, /baixa\s*velocidade/, /internet\s*devagar/, /internet\s*lenta/, /velocidade\s*baixa/);
  const noNav  = hasAny(/nao\s*navega/, /nao\s*conecta/, /sem\s*internet/, /sem\s*acesso/, /sem\s*navegacao/, /sem\s*ip/, /conectado\s*sem\s*internet/);

  if (hasAny(/dstech\s*play/, /dstechplay/, /cdntv/, /cdn\s*tv/,
             /canais\s*bloqueados/, /acesso\s*ao\s*dstech/, /dados\s*dstech/, /senha\s*dstech/,
             /baixar\s*dstech/, /dstech\s*play\s*e/, /acesso.*play/, /play.*acesso/)) {
    return SUPPORT_CATEGORIES.DSTECH_PLAY;
  }

  if (hasAny(/tvbox/, /tv\s*box/, /dificuldade.*tv/, /problema.*tv/, /tv.*travando/, /smart\s*tv/,
             /televisao/, /\biptv\b/, /lentidao.*tv/)) {
    return SUPPORT_CATEGORIES.TV_IPTV;
  }

  if (hasAny(/ping\s*alto/, /lag/, /\bjogo\b/, /jogos/, /ms\s*alto/)) {
    return SUPPORT_CATEGORIES.PING_JOGO;
  }

  if (hasAny(/cancelar/, /cancelamento/, /possivel\s*cancelamento/, /quer\s*cancelar/,
             /deseja\s*cancelar/, /cancelado/)) {
    return SUPPORT_CATEGORIES.CANCELAMENTO;
  }

  if (hasAny(/reativar/, /reativacao/, /reativad/, /reversao.*cancelamento/, /reversao\s*de\s*cancel/,
             /possivel\s*reativacao/, /possivel\s*retorno/)) {
    return SUPPORT_CATEGORIES.REATIVACAO;
  }

  if (hasAny(/mudanca\s*de\s*plano/, /mudar\s*plano/, /troca\s*de\s*plano/, /alterar\s*plano/,
             /mudanca\s*plano/, /quer\s*mudar\s*de\s*plano/)) {
    return SUPPORT_CATEGORIES.MUDANCA_PLANO;
  }

  if (hasAny(/titularidade/, /mudar\s*titular/, /troca\s*de\s*titular/, /mudanca\s*de\s*titular/)) {
    return SUPPORT_CATEGORIES.MUDANCA_TITULARIDADE;
  }

  if (hasAny(/mudanca\s*de\s*endereco/, /mudar\s*endereco/, /mudou\s*de\s*endereco/, /se\s*mudou/,
             /novo\s*endereco/, /alteracao.*endereco/)) {
    return SUPPORT_CATEGORIES.MUDANCA_ENDERECO;
  }

  if (hasAny(/bloqueio/, /suspensao/, /suspens/, /desbloqueio/, /status\s*[456]/, /aviso\s*de\s*bloqueio/,
             /contrato.*bloqueado/, /inadimpl/)) {
    return SUPPORT_CATEGORIES.BLOQUEIO_SUSPENSAO;
  }

  if (hasAny(/boleto/, /fatura/, /pagamento/, /cobran/, /vencimento/, /debito/, /nota\s*fiscal/,
             /comprovante/, /financeiro/, /pagar\s*no\s*credito/, /boleto\s*pago/, /duplicidade/)) {
    return SUPPORT_CATEGORIES.BOLETO_FINANCEIRO;
  }

  if (hasAny(/sinal\s*fraco/, /wifi.*nao\s*aparece/, /wi.fi.*nao\s*aparece/, /alcance/,
             /nao\s*aparece.*wifi/, /repetidor/, /sinal\s*insuficiente/)) {
    return SUPPORT_CATEGORIES.WIFI_SINAL_FRACO;
  }

  if (hasAny(/wi.fi/, /wifi/, /senha.*rede/, /nome.*rede/, /rede.*senha/, /ssid/,
             /troca.*senha/, /senha.*wi/, /alterar.*senha/, /mudar.*senha.*wi/,
             /rede\s*2g/, /rede\s*5g/)) {
    return SUPPORT_CATEGORIES.WIFI_SENHA;
  }

  if (hasAny(/roteador/, /reconfigurar.*roteador/, /roteador.*desconfigurado/, /roteador.*particular/,
             /equipamento.*proprio/, /aparelho.*proprio/)) {
    return SUPPORT_CATEGORIES.ROTEADOR;
  }

  if (hasAny(/comodo/, /ponto\s*de\s*rede/, /mudanca\s*de\s*ponto/, /novo\s*ponto/, /segundo\s*ponto/)) {
    return SUPPORT_CATEGORIES.MUDANCA_COMODO;
  }

  if (hasAny(/troca\s*de\s*onu/, /troca.*onu/, /substituir\s*onu/, /instalar\s*onu\s*\d/,
             /trocar\s*onu/, /onu\s*\d{3}/, /instalar\s*\d{3}/, /instalar\s*(huawei|onu)/)) {
    return SUPPORT_CATEGORIES.TROCA_ONU;
  }

  if (hasAny(/correcao\s*de\s*sinal/, /sinal\s*fora\s*do\s*padrao/, /sinal\s*alto/, /sinal\s*baixo/,
             /drop\s*atenuado/, /drop\s*baixo/, /acao\s*de\s*melhoria/, /atendimento\s*externo/)) {
    return SUPPORT_CATEGORIES.CORRECAO_SINAL;
  }

  if (hasAny(/drop\s*rompido/, /drop\s*rompimento/, /fibra\s*rompida/, /cabo\s*rompido/,
             /drop\s*danificado/, /fibra\s*cortada/, /conector.*optico.*danificado/)) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_DROP;
  }

  if (isSlow && isLink) {
    return SUPPORT_CATEGORIES.LENTIDAO_LINK;
  }

  if (isLink && !noNav) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_LINK;
  }

  if (isLink && noNav) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_LINK;
  }

  if (hasAny(/sem\s*sinal/, /leds?\s*apagados/, /onu\s*apagada/, /luzes\s*apagadas/,
             /sem\s*energia.*onu/, /onu.*queimada/, /pwr\s*apagado/, /pwr\s*fixa/,
             /power\s*aceso\s*apena/, /apenas.*power/, /only.*power/)) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_SEM_SINAL;
  }

  if (hasAny(/\blos\b/, /\bpon\b/, /\bpwr\b/, /los\s*piscando/, /pon\s*piscando/,
             /pon\s*apagado/, /luz\s*vermelha/, /sem\s*sincronismo/, /onu\s*nao\s*registra/,
             /nao\s*conecta/, /nao\s*conectad/)) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_LOS_PON;
  }

  if (isSlow) {
    return SUPPORT_CATEGORIES.LENTIDAO;
  }

  if (hasAny(/intermitente/, /oscilando/, /caindo/, /instavel/, /instabilidade/, /oscilac/,
             /cai\s*toda\s*hora/, /queda\s*constante/, /picotando/, /conexao\s*caindo/,
             /conexao\s*intermitente/, /quedas\s*frequentes/, /quedas\s*constantes/)) {
    return SUPPORT_CATEGORIES.INTERMITENCIA;
  }

  if (hasAny(/ip\s*travado/, /sem\s*ip/, /sem\s*autenticacao/, /conectado\s*sem\s*internet/,
             /sem\s*autenticar/, /nao\s*autentica/, /ip\s*invalido/)) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_IP;
  }

  if (hasAny(/onu\s*travada/, /onu\s*travando/, /reiniciar\s*onu/, /reset.*onu/, /onu.*reinici/)) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_ONU_TRAVADA;
  }

  if (hasAny(/nao\s*navega/, /sem\s*internet/, /sem\s*acesso/, /sem\s*navegacao/,
             /cliente\s*sem\s*acesso/, /nao\s*esta\s*navegando/)) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_GERAL;
  }

  if (hasAny(/\bcontato\b/, /sem\s*comunicacao/, /nao\s*se\s*comunicou/, /sem\s*resposta/,
             /nao\s*respondeu/, /cliente\s*inativo/, /\binativo\b/, /tentativa\s*de\s*contato/)) {
    return SUPPORT_CATEGORIES.CONTATO_SEM_PROBLEMA;
  }

  return SUPPORT_CATEGORIES.OUTROS;
}

export function buildSupportSummary(records: Array<{ problemaReclamado: string }>): SupportCategoryItem[] {
  const total = records.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();

  for (const record of records) {
    const categoria = classifySupportRecord(record.problemaReclamado);
    counts.set(categoria, (counts.get(categoria) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([tipo, quantidade]) => ({
      tipo,
      quantidade,
      percentual: Number(((quantidade / total) * 100).toFixed(2)),
    }))
    .sort((left, right) => right.quantidade - left.quantidade || left.tipo.localeCompare(right.tipo));
}
