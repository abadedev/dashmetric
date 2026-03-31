// @ts-nocheck
'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/sidebar';

export function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard Executivo';
    if (pathname.startsWith('/atendimentos')) return 'Atendimentos';
    if (pathname.startsWith('/ranking')) return 'Ranking de Técnicos';
    if (pathname.startsWith('/qualidade')) return 'Qualidade e Reclamações';
    if (pathname.startsWith('/suporte')) return 'Suporte Técnico';
    if (pathname.startsWith('/resumo-sla')) return 'Resumo SLA';
    if (pathname.startsWith('/upload')) return 'Importar Dados';
    return 'Dashboard';
  };

  return (
    <header className="flex h-16 items-center border-b bg-background px-4 md:px-6 shrink-0 w-full z-20 sticky top-0">
      {/* Mobile Menu */}
      <div className="md:hidden mr-2 shrink-0">
        <Sheet>
          <SheetTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 shrink-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            {/* Reuso do Componente Sidebar passando propriedades ou renderizando direto */}
            <div className="h-full relative isolate z-50">
              <Sidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <h1 className="text-lg md:text-xl font-semibold truncate flex-1">{getTitle()}</h1>
      
      <div className="ml-auto flex items-center space-x-2 md:space-x-4 shrink-0">
        <div className="hidden md:block text-sm text-muted-foreground mr-2">
          Bem-vindo, Administrador
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium shrink-0">
          DS
        </div>
      </div>
    </header>
  );
}
