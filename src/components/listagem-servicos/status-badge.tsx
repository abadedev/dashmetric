'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  em_andamento: { label: 'Em andamento', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  resolvido: { label: 'Resolvido', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  nao_resolvido: { label: 'N\u00E3o resolvido', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  tecnico_direcionado: { label: 'T\u00E9cnico direcionado', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

const PRIORITY_CONFIG: Record<string, { className: string }> = {
  '1': { className: 'h-2.5 w-2.5 rounded-full bg-red-500' },
  '2': { className: 'h-2.5 w-2.5 rounded-full bg-amber-400' },
  '-': { className: 'h-2.5 w-2.5 rounded-full bg-muted-foreground/40' },
};

export function StatusBadge({ status }: { status: string | null }) {
  const config = STATUS_CONFIG[status ?? ''] ?? { label: status ?? '\u2014', className: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function PriorityDot({ priority }: { priority: string | null }) {
  const config = PRIORITY_CONFIG[priority ?? ''] ?? PRIORITY_CONFIG['-'];
  return (
    <div className="flex items-center justify-center">
      <span className={config.className} title={`Prioridade ${priority ?? '-'}`} />
    </div>
  );
}
