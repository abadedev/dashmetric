export type SupportCategoryItem = {
  tipo: string;
  quantidade: number;
  percentual: number;
};

export const SUPPORT_CATEGORIES = {
  NAO_NAVEGA_ONU: 'Não Navega (ONU/IP travado ou pendência financeira)',
  NAO_CONECTA_ONU: 'Não Conecta (LOS, PON ou PWR piscando, etc..)',
  LENTIDAO: 'Lentidão',
  INTERMITENCIA: 'Intermitência',
  BLOQUEIO_BOLETO: 'Bloqueio/Boleto',
  NAO_CONECTA_LINK: 'Não Conecta (Rede - Link)',
  NAO_NAVEGA_LINK: 'Não Navega (Rede - Link)',
  LENTIDAO_LINK: 'Lentidão (Rede - Link)',
  WIFI: 'Wi-Fi (nome da rede e senha)',
  OUTROS_ONU: 'Outros (ONU)',
  ROTEADOR: 'Roteador Particular - Não conecta',
  OUTROS: 'Outros (Situações Atípicas, procedimentos comerciais em geral, dúvidas, etc...)',
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

  const has = (pattern: RegExp) => pattern.test(text);
  const hasAny = (...patterns: RegExp[]) => patterns.some((pattern) => has(pattern));

  const hasLinkContext = hasAny(
    /link/,
    /operadora/,
    /rede\s*externa/,
    /link\s*externo/,
    /sem\s*link/,
    /link\s*down/
  );

  const hasSlowContext = hasAny(
    /lentidao/,
    /\blento\b/,
    /\blenta\b/,
    /baixa\s*velocidade/,
    /velocidade\s*baixa/,
    /internet\s*devagar/,
    /demora\s*para\s*carregar/
  );

  const hasNoNavigateContext = hasAny(
    /nao\s*navega/,
    /sem\s*internet/,
    /sem\s*acesso/,
    /sem\s*ip/,
    /conectado\s*sem\s*internet/,
    /sem\s*navegacao/
  );

  if (
    hasAny(
      /roteador/,
      /particular/,
      /aparelho\s*proprio/,
      /equipamento\s*proprio/,
      /meu\s*roteador/,
      /roteador\s*proprio/
    )
  ) {
    return SUPPORT_CATEGORIES.ROTEADOR;
  }

  if (
    hasAny(
      /wi.?fi/,
      /senha/,
      /\bssid\b/,
      /nome\s*da\s*rede/,
      /rede\s*2g/,
      /rede\s*5g/,
      /trocar\s*senha/
    )
  ) {
    return SUPPORT_CATEGORIES.WIFI;
  }

  if (
    hasAny(
      /boleto/,
      /bloqueio/,
      /fatura/,
      /pagamento/,
      /inadimplente/,
      /suspenso/,
      /desbloqueio/,
      /financeiro/
    )
  ) {
    return SUPPORT_CATEGORIES.BLOQUEIO_BOLETO;
  }

  if (
    hasAny(
      /intermitente/,
      /oscilando/,
      /caindo/,
      /instavel/,
      /oscila/,
      /cai\s*toda\s*hora/,
      /queda\s*constante/,
      /picotando/
    )
  ) {
    return SUPPORT_CATEGORIES.INTERMITENCIA;
  }

  if (hasSlowContext && hasLinkContext) {
    return SUPPORT_CATEGORIES.LENTIDAO_LINK;
  }

  if (
    hasAny(/rompimento/, /queda\s*geral/, /backbone/) ||
    hasAny(/back\s*bones?/, /rompido/, /link\s*indisponivel/, /operadora\s*fora/) ||
    (hasLinkContext && !hasNoNavigateContext && !hasSlowContext)
  ) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_LINK;
  }

  if (
    hasAny(/nao\s*navega/, /sem\s*internet/, /sem\s*acesso/) &&
    hasAny(/link/, /operadora/, /rede\s*externa/)
  ) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_LINK;
  }

  if (
    hasAny(
      /\blos\b/,
      /\bpon\b/,
      /\bpwr\b/,
      /sem\s*sinal/,
      /fibra/,
      /nao\s*conecta/,
      /pon\s*apagado/,
      /luz\s*vermelha/,
      /sem\s*sincronismo/,
      /onu\s*nao\s*registra/
    )
  ) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_ONU;
  }

  if (
    hasAny(
      /nao\s*navega/,
      /sem\s*internet/,
      /sem\s*acesso/,
      /onu\s*travada/,
      /sem\s*ip/,
      /ip\s*travado/,
      /sem\s*navegacao/,
      /conectado\s*sem\s*internet/,
      /sem\s*autenticacao/
    )
  ) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_ONU;
  }

  if (
    hasAny(
      /lentidao/,
      /\blento\b/,
      /\blenta\b/,
      /baixa\s*velocidade/,
      /velocidade\s*baixa/,
      /internet\s*devagar/,
      /demora\s*para\s*carregar/
    )
  ) {
    return SUPPORT_CATEGORIES.LENTIDAO;
  }

  if (hasAny(/\bonu\b/, /reset/, /reiniciar/, /reconfigurar/, /troca\s*de\s*onu/, /configurar\s*onu/)) {
    return SUPPORT_CATEGORIES.OUTROS_ONU;
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
