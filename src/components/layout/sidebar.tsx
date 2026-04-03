'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
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
import type { WorkspaceWithRole } from '@/lib/workspace';

const fallbackNavItems = [
  { name: 'Dashboard Executivo', href: '/dashboard', icon: LayoutDashboard },
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

interface SidebarProps {
  userWorkspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole;
  userRole: string;
}

export function Sidebar({ userWorkspaces, activeWorkspace, userRole }: SidebarProps) {
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
      icon: iconMap[item.icon] ?? LayoutDashboard,
    })) ?? fallbackNavItems;

  return (
    <div className="flex w-64 flex-col bg-sidebar h-screen fixed left-0 top-0 z-30 border-r border-border">
      {/* Workspace Switcher */}
      <div className="flex items-center px-3 py-3 border-b border-border shrink-0 h-14">
        <WorkspaceSwitcher
          workspaces={userWorkspaces}
          activeWorkspace={activeWorkspace}
          userRole={userRole}
        />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto py-3 px-3">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground/70'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border shrink-0">
        <span className="text-xs text-muted-foreground/60">NOC Performance Manager v1.0.0</span>
      </div>
    </div>
  );
}
