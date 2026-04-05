'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { DstechLogo } from '@/components/brand/dstech-logo';
import {
  BarChart3,
  Network,
  TrendingUp,
  UserMinus,
  LayoutDashboard,
  ListTodo,
  Trophy,
  CheckCircle,
  HeadphonesIcon,
  BarChart,
  Upload,
} from 'lucide-react';
const fallbackNavItems = [
  { name: 'Dashboard Executivo', href: '/', icon: LayoutDashboard },
  { name: 'Atendimentos', href: '/atendimentos', icon: ListTodo },
  { name: 'Ranking Técnicos', href: '/ranking', icon: Trophy },
  { name: 'Qualidade & Reclam.', href: '/qualidade', icon: CheckCircle },
  { name: 'Suporte Técnico', href: '/suporte', icon: HeadphonesIcon },
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
} as const;

export function Sidebar() {
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: ['sidebar-modules'],
    queryFn: async () => {
      const response = await fetch('/api/modules/sidebar');
      if (!response.ok) {
        throw new Error('Falha ao carregar módulos');
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
      href: item.href === '/dashboard' ? '/' : item.href,
      icon: iconMap[item.icon] ?? LayoutDashboard,
    })) ?? fallbackNavItems;

  return (
    <div className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--sidebar)_88%,white_12%),var(--sidebar))] shadow-[10px_0_40px_-28px_color-mix(in_oklab,var(--foreground)_20%,transparent)]">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border/80 px-5">
        <Link href="/" className="flex items-center opacity-85 transition-opacity hover:opacity-100">
          <DstechLogo className="h-10 w-auto text-sidebar-foreground" />
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">
            Navegação operacional
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isDashboardLink = item.href === '/';
            const isActive = isDashboardLink
              ? pathname === '/' || pathname === '/dashboard' || pathname.endsWith('/dashboard')
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border border-sidebar-border/80 bg-sidebar-accent/75 text-sidebar-foreground shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)]'
                    : 'border border-transparent text-sidebar-foreground/72 hover:border-sidebar-border/70 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground'
                )}
              >
                <span
                  className={cn(
                    'absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-transparent transition-all',
                    isActive && 'bg-sidebar-foreground/40'
                  )}
                />
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border/80 px-5 py-3.5">
        <span className="text-xs text-sidebar-foreground/50">Dashmetric v1.0.0</span>
      </div>
    </div>
  );
}
