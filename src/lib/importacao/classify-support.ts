// ── Classificação automática de atendimentos de suporte por telefone ──────────

export type SupportCategoryItem = {
  tipo: string;
  quantidade: number;
  percentual: number;
};

// Nomes canônicos das categorias (exatamente como pedido)
export const SUPPORT_CATEGORIES = {
  NAO_NAVEGA_ONU:    'Não Navega (ONU/IP travado ou pendência financeira)',
  NAO_CONECTA_ONU:   'Não Conecta (LOS, PON ou PWR piscando, etc..)',
  LENTIDAO:          'Lentidão',
  INTERMITENCIA:     'Intermitência',
  BLOQUEIO_BOLETO:   'Bloqueio/Boleto',
  NAO_CONECTA_LINK:  'Não Conecta (Rede - Link)',
  NAO_NAVEGA_LINK:   'Não Navega (Rede - Link)',
  LENTIDAO_LINK:     'Lentidão (Rede - Link)',
  WIFI:              'Wi-Fi (nome da rede e senha)',
  OUTROS_ONU:        'Outros (ONU)',
  ROTEADOR:          'Roteador Particular - Não conecta',
  OUTROS:            'Outros (Situações Atípicas, procedimentos comerciais em geral, dúvidas, etc...)',
} as const;

/**
 * Normaliza texto: trim, lowercase, remove acentos, colapsa espaços.
 */
export function normalizeText(value: string): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Classifica um atendimento de suporte em uma das 12 categorias padronizadas.
 * Segue a ordem de prioridade definida (mais específico primeiro).
 */
export function classifySupportRecord(problemaReclamado: string): string {
  const text = normalizeText(problemaReclamado ?? '');

  if (!text) return SUPPORT_CATEGORIES.OUTROS;

  const has = (pattern: RegExp) => pattern.test(text);
  const hasAny = (...patterns: RegExp[]) => patterns.some((pattern) => has(pattern));

  // 1. Roteador Particular — mais específico, deve vir primeiro
  if (hasAny(/roteador/, /particular/, /aparelho\s*proprio/, /equipamento\s*proprio/)) {
    return SUPPORT_CATEGORIES.ROTEADOR;
  }

  // 2. Wi-Fi
  if (hasAny(/wi.?fi/, /senha/, /\bssid\b/, /nome\s*da\s*rede/)) {
    return SUPPORT_CATEGORIES.WIFI;
  }

  // 3. Bloqueio/Boleto
  if (hasAny(/boleto/, /bloqueio/, /fatura/, /pagamento/, /inadimplente/)) {
    return SUPPORT_CATEGORIES.BLOQUEIO_BOLETO;
  }

  // 4. Intermitência
  if (hasAny(/intermitente/, /oscilando/, /caindo/, /instavel/)) {
    return SUPPORT_CATEGORIES.INTERMITENCIA;
  }

  // 5. Lentidão (Rede - Link) — composta: lentidão + contexto de link
  if (hasAny(/lentidao/, /\blento\b/, /\blenta\b/) && hasAny(/link/, /operadora/, /rede\s*externa/)) {
    return SUPPORT_CATEGORIES.LENTIDAO_LINK;
  }

  // 6. Não Navega (Rede - Link) — composta: navegação + link (antes do genérico de link)
  if (has(/nao\s*navega/) && has(/link/)) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_LINK;
  }

  // 7. Não Conecta (Rede - Link) — problemas de infraestrutura de rede
  if (has(/rompimento|queda\s*geral|backbone/) || (has(/link/) && !has(/nao\s*navega/))) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_LINK;
  }

  // 8. Não Conecta (LOS, PON, PWR...) — sem sinal óptico
  if (hasAny(/\blos\b/, /\bpon\b/, /\bpwr\b/, /sem\s*sinal/, /fibra/, /nao\s*conecta/)) {
    return SUPPORT_CATEGORIES.NAO_CONECTA_ONU;
  }

  // 9. Não Navega (ONU/IP travado) — sem internet genérico
  if (hasAny(/nao\s*navega/, /sem\s*internet/, /sem\s*acesso/, /onu\s*travada/, /sem\s*ip/)) {
    return SUPPORT_CATEGORIES.NAO_NAVEGA_ONU;
  }

  // 10. Lentidão — genérico
  if (hasAny(/lentidao/, /\blento\b/, /\blenta\b/)) {
    return SUPPORT_CATEGORIES.LENTIDAO;
  }

  // 11. Outros (ONU) — operações de ONU sem problema de conectividade
  if (hasAny(/\bonu\b/, /reset/, /reiniciar/)) {
    return SUPPORT_CATEGORIES.OUTROS_ONU;
  }

  // 12. Fallback
  return SUPPORT_CATEGORIES.OUTROS;
}

/**
 * Gera resumo consolidado de categorias a partir de uma lista de registros.
 * Cada registro precisa ter o campo `problemaReclamado`.
 * Retorna ordenado do maior para o menor, com percentual de 2 casas decimais.
 */
export function buildSupportSummary(
  records: Array<{ problemaReclamado: string }>
): SupportCategoryItem[] {
  const total = records.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {};
  for (const r of records) {
    const categoria = classifySupportRecord(r.problemaReclamado);
    counts[categoria] = (counts[categoria] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([tipo, quantidade]) => ({
      tipo,
      quantidade,
      percentual: Number(((quantidade / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.tipo.localeCompare(b.tipo));
}
