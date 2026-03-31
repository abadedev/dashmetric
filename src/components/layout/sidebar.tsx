'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListTodo,
  Trophy,
  CheckCircle,
  HeadphonesIcon,
  BarChart,
  Upload,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard Executivo', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Atendimentos', href: '/atendimentos', icon: ListTodo },
  { name: 'Ranking Técnicos', href: '/ranking', icon: Trophy },
  { name: 'Qualidade & Reclam.', href: '/qualidade', icon: CheckCircle },
  { name: 'Suporte Técnico', href: '/suporte', icon: HeadphonesIcon },
  { name: 'Resumo SLA', href: '/resumo-sla', icon: BarChart },
  { name: 'Importar Dados', href: '/upload', icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r bg-card h-screen fixed left-0 top-0 z-30">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight text-primary">DSTECH</h2>
        <p className="text-xs text-muted-foreground mt-1">NOC Performance Manager</p>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 transition-all hover:text-primary',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-border/50 text-xs text-muted-foreground text-center">
        Versão 1.0.0
      </div>
    </div>
  );
}
