'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_LABELS, formatSLATime } from '@/lib/services/sla-engine';

export const Columns: ColumnDef<any>[] = [
  {
    accessorKey: 'osNumber',
    header: 'Nº OS',
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue('osNumber') || 'S/N'}</div>,
  },
  {
    accessorKey: 'activityType',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('activityType') as string;
      const label = ACTIVITY_LABELS[type] || type;

      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      if (type === 'instalacao_nova' || type === 'instalacao_reativacao') variant = 'default';
      else if (type === 'reparo') variant = 'secondary';
      else if (type === 'retirada_kit') variant = 'destructive';

      return (
        <Badge variant={variant} className="whitespace-nowrap">
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'technicianName',
    header: 'Técnico',
    cell: ({ row }) => <div className="font-medium">{row.getValue('technicianName')}</div>,
  },
  {
    accessorKey: 'openedAt',
    header: 'Abertura',
    cell: ({ row }) => {
      const date = new Date(row.getValue('openedAt'));
      return <div className="whitespace-nowrap text-xs">{date.toLocaleString('pt-BR')}</div>;
    },
  },
  {
    accessorKey: 'closedAt',
    header: 'Fechamento',
    cell: ({ row }) => {
      const raw = row.getValue('closedAt');
      if (!raw) return <span className="text-xs text-muted-foreground">Em aberto</span>;
      const date = new Date(raw as string);
      return <div className="whitespace-nowrap text-xs">{date.toLocaleString('pt-BR')}</div>;
    },
  },
  {
    accessorKey: 'slaUtilSeconds',
    header: 'SLA Útil',
    cell: ({ row }) => {
      const seconds = row.getValue('slaUtilSeconds') as number;
      if (seconds === null || seconds === undefined) return '-';
      return <div className="font-mono text-xs">{formatSLATime(seconds)}</div>;
    },
  },
  {
    accessorKey: 'withinSlaUtil',
    header: 'Status Meta',
    cell: ({ row }) => {
      const isWithin = row.getValue('withinSlaUtil') as boolean;
      if (isWithin === null) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge
          variant={isWithin ? 'default' : 'destructive'}
          className={isWithin ? 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : ''}
        >
          {isWithin ? 'NO PRAZO' : 'FORA'}
        </Badge>
      );
    },
  },
];
