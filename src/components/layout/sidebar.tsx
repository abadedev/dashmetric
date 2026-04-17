'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  BarChart3,
  CheckCircle,
  HeadphonesIcon,
  LayoutDashboard,
  ListTodo,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Trophy,
  Upload,
  UserMinus,
} from 'lucide-react';
import { WorkspaceBrand } from '@/components/brand/workspace-brand';
import { useSidebar } from '@/components/layout/sidebar-context';
import { cn } from '@/lib/utils';
import { getWorkspaceSlugFromPathname, resolveWorkspaceHref } from '@/lib/workspace-navigation';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const fallbackNavItems = [
  { name: 'Dashboard Executivo', href: '/', icon: LayoutDashboard },
  { name: 'Atendimentos', href: '/atendimentos', icon: ListTodo },
  { name: 'Ranking TÃ©cnicos', href: '/ranking', icon: Trophy },
  { name: 'Qualidade & Reclam.', href: '/qualidade', icon: CheckCircle },
  { name: 'Suporte TÃ©cnico', href: '/suporte', icon: HeadphonesIcon },
  { name: 'Vendas', href: '/vendas', icon: TrendingUp },
  { name: 'Cancelamentos', href: '/cancelamentos', icon: UserMinus },
  { name: 'Infraestrutura', href: '/infraestrutura', icon: Network },
  { name: 'Resumo SLA', href: '/resumo-sla', icon: BarChart },
  { name: 'Importar Dados', href: '/upload', icon: Upload },
];

const iconMap = {
  LayoutDashboard,
  ListTodo,
  Trophy,
  CheckCircle,
  HeadphonesIcon,
  BarChart,
  BarChart3,
  Upload,
  TrendingUp,
  UserMinus,
  Network,
  WhatsAppIcon,
} as const;

type WorkspaceEntry = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
};

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile = false }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const workspaceSlug = getWorkspaceSlugFromPathname(pathname);
  const [cookieSlug, setCookieSlug] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.split('; ').find((c) => c.startsWith('dwm_active_workspace='));
    setCookieSlug(match ? decodeURIComponent(match.split('=')[1] ?? '') : null);
  }, [pathname]);

  const effectiveSlug = workspaceSlug ?? cookieSlug;
  const effectiveCollapsed = mobile ? false : collapsed;

  const { data: wsData } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces/my');
      if (!res.ok) return { data: [] as WorkspaceEntry[] };
      return res.json() as Promise<{ data: WorkspaceEntry[] }>;
    },
    staleTime: 30_000,
  });
  const workspaces = wsData?.data ?? [];

  const activeWorkspace = effectiveSlug
    ? workspaces.find((workspace) => workspace.slug === effectiveSlug)
    : workspaces[0];

  const { data } = useQuery({
    queryKey: ['sidebar-modules', workspaceSlug],
    queryFn: async () => {
      const response = await fetch('/api/modules/sidebar');
      if (!response.ok) {
        throw new Error('Falha ao carregar mÃ³dulos');
      }
      return response.json() as Promise<{
        data: Array<{ id: number; name: string; href: string; icon: keyof typeof iconMap }>;
      }>;
    },
    retry: false,
  });

  const navItems =
    data?.data?.map((item) => ({
      ...item,
      href: resolveWorkspaceHref(item.href, workspaceSlug),
      icon: iconMap[item.icon] ?? LayoutDashboard,
    })) ??
    fallbackNavItems.map((item) => ({
      ...item,
      href: resolveWorkspaceHref(item.href, workspaceSlug),
    }));

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--sidebar)_88%,white_12%),var(--sidebar))] shadow-[10px_0_40px_-28px_color-mix(in_oklab,var(--foreground)_20%,transparent)]',
        mobile
          ? 'h-full w-64'
          : cn(
              'sticky top-0 h-screen will-change-[width] transition-[width] duration-200 ease-out motion-reduce:transition-none',
              effectiveCollapsed ? 'w-16' : 'w-64'
            )
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/80 px-3',
          mobile && 'px-4',
          effectiveCollapsed && !mobile && 'justify-center gap-0 px-2'
        )}
      >
        {!effectiveCollapsed && (
          <Link
            href={resolveWorkspaceHref('/', workspaceSlug)}
            className="flex min-w-0 flex-1 items-center opacity-85 transition-opacity hover:opacity-100"
          >
            {activeWorkspace ? (
              <WorkspaceBrand
                name={activeWorkspace.name}
                logoUrl={activeWorkspace.logoUrl}
                logoDarkUrl={activeWorkspace.logoDarkUrl}
                logoLightUrl={activeWorkspace.logoLightUrl}
                size="sidebar"
              />
            ) : (
              <WorkspaceBrand name="Dashmetric" size="sidebar" />
            )}
          </Link>
        )}

        {!mobile && (
          <button
            type="button"
            onClick={toggle}
            aria-label={effectiveCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-pressed={!effectiveCollapsed}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/75 hover:text-sidebar-foreground',
              effectiveCollapsed && 'mx-auto'
            )}
          >
            {effectiveCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div
        className={cn(
          'flex-1 overflow-x-hidden overflow-y-auto px-2 py-4',
          mobile && 'px-3',
          effectiveCollapsed && !mobile && 'px-1.5'
        )}
      >
        {false && !effectiveCollapsed && (
          <div className="mb-3 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">
              Navegação operacional
            </p>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isDashboardLink = item.href.endsWith('/dashboard') || item.href === '/';
            const isActive = isDashboardLink
              ? pathname === item.href || pathname === '/' || pathname.endsWith('/dashboard')
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={effectiveCollapsed ? item.name : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ease-out motion-reduce:transition-none',
                  effectiveCollapsed ? 'mx-auto h-10 w-10 justify-center px-0 py-0' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'border border-sidebar-border/80 bg-sidebar-accent/75 text-sidebar-foreground shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)]'
                    : 'border border-transparent text-sidebar-foreground/72 hover:border-sidebar-border/70 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground'
                )}
              >
                {!effectiveCollapsed && (
                  <span
                    className={cn(
                      'absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-transparent transition-all',
                      isActive && 'bg-sidebar-foreground/40'
                    )}
                  />
                )}
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                  )}
                />
                {!effectiveCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {!effectiveCollapsed && (
        <div
          onClick={() => window.location.href = 'https://www.linkedin.com/in/rafael-abade/'}
          className="cursor-pointer shrink-0 border-t border-sidebar-border/80 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Image
              src="https://lh3.googleusercontent.com/a/ACg8ocJOhWkGNQHE-zbn2F7bopSptXBrEh9nCAZKyTCUv2lp2eZWynFS=s288-c-no"
              alt="Rafael de S Abade Junior"
              width={36}
              height={36}
              className="shrink-0 rounded-full ring-1 ring-sidebar-border/60"
              unoptimized
            />
            <div className="min-w-0 flex flex-col">
              <span className="truncate text-xs font-medium leading-tight text-sidebar-foreground/90">
                Rafael de S Abade Junior
              </span>
              <span className="text-[10px] leading-tight text-sidebar-foreground/45">Criador/Desenvolvedor</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
