'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { cn } from '@/lib/utils';

interface SidebarAwareContentProps {
  children: React.ReactNode;
  widget?: React.ReactNode;
}

export function SidebarAwareContent({ children, widget }: SidebarAwareContentProps) {
  const pathname = usePathname();
  const isListagemServicosRoute = pathname === '/listagem-servicos' || /\/[^/]+\/listagem-servicos$/.test(pathname);

  return (
    <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_92%,white_8%),var(--background))]">
      <Header />
      <main className="min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
        <div
          className={cn(
            'min-w-0 w-full py-4 md:py-6 lg:py-8',
            isListagemServicosRoute
              ? 'max-w-none px-3 md:px-4 xl:px-5 2xl:px-6'
              : 'mx-auto max-w-[1440px] px-4 md:px-6 lg:px-8'
          )}
        >
          {children}
        </div>
      </main>
      {widget}
    </div>
  );
}
