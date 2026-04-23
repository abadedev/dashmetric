'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  pendente: { label: 'Pendente', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dotClass: 'bg-orange-400' },
  em_andamento: { label: 'Em andamento', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dotClass: 'bg-blue-400' },
  resolvido: { label: 'Resolvido', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-400' },
  nao_resolvido: { label: 'Não resolvido', className: 'bg-red-500/15 text-red-400 border-red-500/30', dotClass: 'bg-red-400' },
  tecnico_direcionado: { label: 'Técnico direcionado', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dotClass: 'bg-purple-400' },
  em_monitoramento: { label: 'Em monitoramento', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dotClass: 'bg-amber-400' },
};

const FALLBACK_CONFIG = { label: '—', className: 'bg-muted text-muted-foreground border-border', dotClass: 'bg-muted-foreground' };

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'tecnico_direcionado', label: 'Técnico Direcionado' },
  { value: 'em_monitoramento', label: 'Em Monitoramento' },
  { value: 'nao_resolvido', label: 'Não Resolvido' },
  { value: 'resolvido', label: 'Resolvido' },
];

const PRIORITY_CONFIG: Record<string, { className: string }> = {
  '1': { className: 'h-2.5 w-2.5 rounded-full bg-red-500' },
  '2': { className: 'h-2.5 w-2.5 rounded-full bg-amber-400' },
  '-': { className: 'h-2.5 w-2.5 rounded-full bg-muted-foreground/40' },
};

export function StatusBadge({ status }: { status: string | null }) {
  const config = STATUS_CONFIG[status ?? ''] ?? { ...FALLBACK_CONFIG, label: status ?? '—' };
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function StatusSelectBadge({
  status: initialStatus,
  recordId,
  queryKey,
  canEdit,
}: {
  status: string | null;
  recordId: number;
  queryKey: readonly unknown[];
  canEdit: boolean;
}) {
  const [status, setStatus] = useState(initialStatus ?? 'pendente');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/listagem-servicos/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
      return res.json();
    },
  });

  const handleValueChange = (newStatus: string | null) => {
    if (newStatus === null) return;
    const prev = status;
    setStatus(newStatus);
    mutation.mutate(newStatus, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => {
        setStatus(prev);
        toast.error('Falha ao atualizar o status');
      },
    });
  };

  const config = STATUS_CONFIG[status] ?? { ...FALLBACK_CONFIG, label: status ?? '—' };

  if (!canEdit) {
    return <StatusBadge status={status} />;
  }

  return (
    <SelectPrimitive.Root value={status} onValueChange={handleValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5',
          'text-xs font-medium whitespace-nowrap outline-none transition-opacity',
          'focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed',
          mutation.isPending && 'opacity-50',
          config.className
        )}
        disabled={mutation.isPending}
      >
        <SelectPrimitive.Value>{config.label}</SelectPrimitive.Value>
        <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" sideOffset={6} align="start" alignItemWithTrigger={false} collisionPadding={8}>
          <SelectPrimitive.Popup
            className={cn(
              'isolate z-50 min-w-[180px] overflow-hidden rounded-xl border border-border/70',
              'bg-popover/98 text-popover-foreground shadow-lg backdrop-blur-xl',
              'origin-(--transform-origin)',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'duration-100'
            )}
          >
            <SelectPrimitive.List className="p-1">
              {STATUS_OPTIONS.map((opt) => {
                const optConfig = STATUS_CONFIG[opt.value] ?? FALLBACK_CONFIG;
                return (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className="relative flex cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                  >
                    <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', optConfig.dotClass)} />
                    <SelectPrimitive.ItemText className="flex-1 whitespace-nowrap">{opt.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator
                      render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
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
