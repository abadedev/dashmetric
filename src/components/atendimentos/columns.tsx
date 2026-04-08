'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ACTIVITY_LABELS, formatSLATime } from '@/lib/services/sla-engine';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Color map per activity type key
const TYPE_CLASSES: Record<string, string> = {
  instalacao_nova:               'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  instalacao_reativacao:         'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  reparo:                        'bg-blue-500/10    text-blue-700    border-blue-500/20    dark:text-blue-400',
  retorno:                       'bg-blue-500/10    text-blue-700    border-blue-500/20    dark:text-blue-400',
  mudanca_plano:                 'bg-violet-500/10  text-violet-700  border-violet-500/20  dark:text-violet-400',
  mudanca_endereco:              'bg-violet-500/10  text-violet-700  border-violet-500/20  dark:text-violet-400',
  retirada_kit:                  'bg-amber-500/10   text-amber-700   border-amber-500/20   dark:text-amber-400',
  cancelado_reparo:              'bg-red-500/10     text-red-700     border-red-500/20     dark:text-red-400',
  cancelado_retirada_kit:        'bg-red-500/10     text-red-700     border-red-500/20     dark:text-red-400',
  cancelado_mudanca_endereco:    'bg-red-500/10     text-red-700     border-red-500/20     dark:text-red-400',
  cancelado_retorno:             'bg-red-500/10     text-red-700     border-red-500/20     dark:text-red-400',
  cancelado_reativacao_login:    'bg-red-500/10     text-red-700     border-red-500/20     dark:text-red-400',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const Columns: ColumnDef<any>[] = [
  {
    accessorKey: 'osNumber',
    header: 'Nº OS',
    cell: ({ row }) => (
      <div className="font-mono text-xs font-semibold text-foreground">
        {row.getValue('osNumber') || 'S/N'}
      </div>
    ),
  },
  {
    accessorKey: 'activityType',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('activityType') as string;
      const label = ACTIVITY_LABELS[type] || type;
      const cls = TYPE_CLASSES[type] || 'bg-muted text-muted-foreground border-border';
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
            cls,
          )}
        >
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: 'technicianName',
    header: 'Técnico',
    cell: ({ row }) => {
      const name = row.getValue('technicianName') as string | null;
      if (!name) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
            {initials(name)}
          </span>
          <span className="text-sm font-medium truncate">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'openedAt',
    header: 'Abertura',
    cell: ({ row }) => {
      const date = new Date(row.getValue('openedAt'));
      return (
        <div className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {date.toLocaleString('pt-BR')}
        </div>
      );
    },
  },
  {
    accessorKey: 'closedAt',
    header: 'Fechamento',
    cell: ({ row }) => {
      const raw = row.getValue('closedAt');
      if (!raw) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {new Date(raw as string).toLocaleString('pt-BR')}
        </div>
      );
    },
  },
  {
    accessorKey: 'slaUtilSeconds',
    header: 'SLA Útil',
    cell: ({ row }) => {
      const seconds = row.getValue('slaUtilSeconds') as number | null;
      if (seconds === null || seconds === undefined)
        return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="font-mono text-xs font-medium tabular-nums">
          {formatSLATime(seconds)}
        </div>
      );
    },
  },
  {
    accessorKey: 'withinSlaUtil',
    header: 'Status Meta',
    cell: ({ row }) => {
      const isWithin = row.getValue('withinSlaUtil') as boolean | null;
      if (isWithin === null || isWithin === undefined) {
        return (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Minus className="w-3.5 h-3.5 shrink-0" />
            <span>Sem meta</span>
          </span>
        );
      }
      return isWithin ? (
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Dentro</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400 text-xs font-medium">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Fora</span>
        </span>
      );
    },
  },
];
