'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function TablePagination({
  page,
  totalPages,
  total,
  isLoading,
  onPrev,
  onNext,
}: TablePaginationProps) {
  return (
    /* fixed ao bottom, começa após a sidebar (md:left-64) */
    <div
      className="fixed bottom-0 left-0 right-0 z-30 md:left-64"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-center px-4 py-2.5 border-t border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={page <= 1 || isLoading}
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </Button>

          <span className="min-w-[140px] text-center text-xs text-muted-foreground tabular-nums select-none">
            Página{' '}
            <span className="font-semibold text-foreground">{page}</span>
            {' '}de{' '}
            <span className="font-semibold text-foreground">{totalPages}</span>
            <span className="mx-1.5 text-border">·</span>
            {total.toLocaleString('pt-BR')} registros
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={page >= totalPages || isLoading}
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            Próximo
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
