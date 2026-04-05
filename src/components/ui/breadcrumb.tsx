'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { getWorkspaceSlugFromPathname, resolveWorkspaceHref } from '@/lib/workspace-navigation';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard Executivo',
  atendimentos: 'Atendimentos',
  ranking: 'Ranking Técnicos',
  qualidade: 'Qualidade & Reclamações',
  suporte: 'Suporte Técnico',
  'resumo-sla': 'Resumo SLA',
  upload: 'Importar Dados',
  admin: 'Painel ADM',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const workspaceSlug = getWorkspaceSlugFromPathname(pathname);
  const breadcrumbSegments =
    workspaceSlug && segments[0] === workspaceSlug ? segments.slice(1) : segments;

  if (breadcrumbSegments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link
        href={resolveWorkspaceHref('/', workspaceSlug)}
        className="flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-accent/65 hover:text-foreground"
      >
        <Home className="h-3 w-3" />
      </Link>
      {breadcrumbSegments.map((seg, idx) => {
        const href = resolveWorkspaceHref(`/${breadcrumbSegments.slice(0, idx + 1).join('/')}`, workspaceSlug);
        const label = ROUTE_LABELS[seg] ?? seg;
        const isLast = idx === breadcrumbSegments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-35" />
            {isLast ? (
              <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-1 font-medium text-foreground shadow-[0_8px_20px_-18px_rgba(15,23,42,0.24)]">{label}</span>
            ) : (
              <Link href={href} className="rounded-full px-2 py-1 transition-colors hover:bg-accent/65 hover:text-foreground">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
