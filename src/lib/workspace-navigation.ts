const RESERVED_SEGMENTS = new Set([
  'api',
  'auth',
  'waiting',
  'welcome',
  'admin',
  'dashboard',
  'atendimentos',
  'qualidade',
  'ranking',
  'resumo-sla',
  'suporte',
  'upload',
  'vendas',
  'cancelamentos',
  'infraestrutura',
  'monitoramento',
]);

export function getWorkspaceSlugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const first = parts[0]!;
  return RESERVED_SEGMENTS.has(first) ? null : first;
}

export function resolveWorkspaceHref(href: string, workspaceSlug: string | null) {
  if (!workspaceSlug) {
    return href === '/dashboard' ? '/' : href;
  }

  if (href === '/' || href === '/dashboard') {
    return `/${workspaceSlug}/dashboard`;
  }

  if (href.startsWith(`/${workspaceSlug}/`)) {
    return href;
  }

  return `/${workspaceSlug}${href.startsWith('/') ? href : `/${href}`}`;
}
