'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  HeadphonesIcon,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  TrendingUp,
  Trophy,
  Upload,
  UserMinus,
  Wrench,
} from 'lucide-react';
import { PiMonitor } from 'react-icons/pi';
import { DstechLogo } from '@/components/brand/dstech-logo';
import { useSidebar } from '@/components/layout/sidebar-context';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { getWorkspaceSlugFromPathname, resolveWorkspaceHref } from '@/lib/workspace-navigation';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

type GroupState = Record<string, boolean>;

const TOP_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Análise Comparativa', href: '/resumo-sla', icon: BarChart },
];

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'tecnico',
    label: 'Técnico',
    icon: Wrench,
    items: [
      { name: 'Atividades', href: '/atendimentos', icon: ListTodo },
      { name: 'Ranking Técnicos', href: '/ranking', icon: Trophy },
      { name: 'Qualidade & Reclamações', href: '/qualidade', icon: CheckCircle },
      { name: 'Suporte Técnico', href: '/suporte', icon: HeadphonesIcon },
      { name: 'Omnichannel', href: '/omnichannel', icon: MessageSquare },
    ],
  },
  {
    key: 'comercial',
    label: 'Comercial',
    icon: Briefcase,
    items: [
      { name: 'Cancelamentos', href: '/cancelamentos', icon: UserMinus },
      { name: 'Cobrança', href: '/cobranca', icon: Receipt },
    ],
  },
  {
    key: 'vendas',
    label: 'Vendas',
    icon: TrendingUp,
    items: [
      { name: 'Vendas', href: '/vendas', icon: TrendingUp },
    ],
  },
  {
    key: 'infraestrutura',
    label: 'Infraestrutura',
    icon: Network,
    items: [
      { name: 'Infraestrutura', href: '/infraestrutura', icon: Network },
      { name: 'Listagem de Serviços', href: '/listagem-servicos', icon: ClipboardList },
      { name: 'Monitoramento N2', href: '/monitoramento', icon: PiMonitor },
    ],
  },
];

const DEFAULT_GROUP_STATE: GroupState = {
  tecnico: true,
  comercial: true,
  vendas: true,
  infraestrutura: true,
};

const MODULE_SLUG_BY_HREF: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/resumo-sla': 'resumo-sla',
  '/atendimentos': 'atendimentos',
  '/ranking': 'ranking',
  '/qualidade': 'qualidade',
  '/suporte': 'suporte',
  '/omnichannel': 'omnichannel',
  '/cancelamentos': 'cancelamentos',
  '/cobranca': 'cobranca',
  '/vendas': 'vendas',
  '/infraestrutura': 'infraestrutura',
  '/listagem-servicos': 'listagem-servicos',
  '/monitoramento': 'monitoramento',
  '/upload': 'upload',
};

function loadGroupState(): GroupState {
  if (typeof window === 'undefined') return DEFAULT_GROUP_STATE;
  try {
    const raw = window.localStorage.getItem('sidebar-groups');
    if (!raw) return DEFAULT_GROUP_STATE;
    return { ...DEFAULT_GROUP_STATE, ...(JSON.parse(raw) as GroupState) };
  } catch {
    return DEFAULT_GROUP_STATE;
  }
}

function saveGroupState(state: GroupState) {
  try {
    window.localStorage.setItem('sidebar-groups', JSON.stringify(state));
  } catch {}
}

function resolvedIsActive(href: string, pathname: string, workspaceSlug: string | null): boolean {
  const resolved = resolveWorkspaceHref(href, workspaceSlug);
  if (href === '/dashboard') {
    return pathname === resolved || pathname.endsWith('/dashboard');
  }
  return pathname === resolved || pathname.startsWith(`${resolved}/`);
}

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile = false }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const workspaceSlug = getWorkspaceSlugFromPathname(pathname);
  const effectiveCollapsed = mobile ? false : collapsed;

  const { data: sessionData } = useSession();
  const sessionUser = sessionData?.user as { role?: string } | undefined;
  const isPlatformAdmin = sessionUser?.role === 'admin';

  const [canSeeConfig, setCanSeeConfig] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<Record<string, string> | null>(null);
  const [groupState, setGroupState] = useState<GroupState>(DEFAULT_GROUP_STATE);

  useEffect(() => {
    setGroupState(loadGroupState());
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) {
      setCanSeeConfig(true);
      setModuleAccess({});
      return;
    }
    fetch('/api/me/module-access')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: { moduleAccess?: Record<string, string> } } | null) => {
        const access = json?.data?.moduleAccess ?? {};
        setModuleAccess(access);
        setCanSeeConfig(
          access['infraestrutura'] === 'admin' ||
          access['listagem-servicos'] === 'admin' ||
          access['monitoramento'] === 'admin'
        );
      })
      .catch(() => {
        setModuleAccess({});
      });
  }, [isPlatformAdmin]);

  function canSeeNavItem(item: NavItem) {
    if (isPlatformAdmin) return true;
    const moduleSlug = MODULE_SLUG_BY_HREF[item.href];
    if (!moduleSlug) return false;
    const level = moduleAccess?.[moduleSlug];
    return Boolean(level && level !== 'none');
  }

  const visibleTopItems = TOP_ITEMS.filter(canSeeNavItem);
  const visibleGroups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter(canSeeNavItem) }))
    .filter((group) => group.items.length > 0);
  const uploadItem = { name: 'Importar Dados', href: '/upload', icon: Upload };
  const canSeeUpload = canSeeNavItem(uploadItem);

  function isGroupOpen(group: NavGroup): boolean {
    // Retorna explicitamente o estado salvo pelo usuário (que por padrão é true)
    // Permite que o usuário feche a categoria mesmo se estiver na página atual
    return groupState[group.key] ?? true;
  }

  function toggleGroup(key: string) {
    const next = { ...groupState, [key]: !(groupState[key] ?? true) };
    setGroupState(next);
    saveGroupState(next);
  }

  function NavLink({ item, indent = false }: { item: NavItem; indent?: boolean }) {
    const isActive = resolvedIsActive(item.href, pathname, workspaceSlug);
    const Icon = item.icon;
    return (
      <Link
        href={resolveWorkspaceHref(item.href, workspaceSlug)}
        title={effectiveCollapsed ? item.name : undefined}
        className={cn(
          'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ease-out motion-reduce:transition-none',
          effectiveCollapsed
            ? 'mx-auto h-10 w-10 justify-center px-0 py-0'
            : cn('gap-3 px-3 py-2.5', indent && 'pl-6'),
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
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive
              ? 'text-sidebar-foreground'
              : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
          )}
        />
        {!effectiveCollapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  }

  const allFlatItems: NavItem[] = [
    ...visibleTopItems,
    ...visibleGroups.flatMap((g) => g.items),
    ...(canSeeUpload ? [uploadItem] : []),
    ...(canSeeConfig
      ? [{ name: 'Configurações', href: '/admin', icon: Settings }]
      : []),
  ];

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
            href={resolveWorkspaceHref('/dashboard', workspaceSlug)}
            className="flex min-w-0 flex-1 items-center px-1 opacity-85 transition-opacity hover:opacity-100"
          >
            <DstechLogo className="h-9 w-auto" />
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
            {effectiveCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
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
        <nav className="flex flex-col gap-1">
          {effectiveCollapsed ? (
            allFlatItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))
          ) : (
            <>
              {visibleTopItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}

              {visibleGroups.length > 0 && <div className="my-1 h-px bg-border/50" />}

              {visibleGroups.map((group) => {
                const open = isGroupOpen(group);
                const GroupIcon = group.icon;
                const hasActiveChild = group.items.some((item) =>
                  resolvedIsActive(item.href, pathname, workspaceSlug)
                );

                return (
                  <div key={group.key} className="mt-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        hasActiveChild
                          ? 'text-foreground hover:bg-muted'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <GroupIcon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDown
                        className={cn(
                          'ml-auto h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200',
                          open && 'rotate-180'
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-200',
                        open ? 'max-h-96' : 'max-h-0'
                      )}
                    >
                      <div className="flex flex-col gap-0.5 pb-1">
                        {group.items.map((item) => (
                          <NavLink key={item.href} item={item} indent />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(canSeeUpload || canSeeConfig) && <div className="my-1 h-px bg-border/50" />}

              <div className="mt-2 flex flex-col gap-1 pt-2">
                {canSeeUpload && <NavLink item={uploadItem} />}
                {canSeeConfig && (
                  <NavLink item={{ name: 'Configurações', href: '/admin', icon: Settings }} />
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {!effectiveCollapsed && (
        <div className="shrink-0 border-t border-sidebar-border/80">
          <div
            onClick={() => window.open('https://www.linkedin.com/in/rafael-abade/', '_blank', 'noopener,noreferrer')}
            className="cursor-pointer px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Image
                src="https://lh3.googleusercontent.com/a/ACg8ocJOhWkGNQHE-zbn2F7bopSptXBrEh9nCAZKyTCUv2lp2eZWynFS=s288-c-no"
                alt="Rafael de S Abade Junior"
                width={36}
                height={36}
                className="rounded-full ring-1 ring-sidebar-border/60 shrink-0"
                unoptimized
              />
              <div className="min-w-0 flex flex-col">
                <span className="truncate text-xs font-medium text-sidebar-foreground/90 leading-tight">
                  Rafael de S Abade Junior
                </span>
                <span className="text-[10px] text-sidebar-foreground/45 leading-tight">Criador/Desenvolvedor</span>
              </div>
            </div>
          </div>
          <p className="px-4 pb-3 text-[10px] text-sidebar-foreground/30 leading-tight">
            DashMetric v1.5.0
          </p>
        </div>
      )}
    </aside>
  );
}
