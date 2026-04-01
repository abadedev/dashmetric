'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

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

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3 w-3" />
      </Link>
      {segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const label = ROUTE_LABELS[seg] ?? seg;
        const isLast = idx === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-40" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
