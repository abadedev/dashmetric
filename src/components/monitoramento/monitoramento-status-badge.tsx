'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, STATUS_OPTIONS } from '@/lib/monitoramento/constants';

const FALLBACK_CONFIG = { label: '—', className: 'bg-muted text-muted-foreground border-border', dotClass: 'bg-muted-foreground' };

export function MonitoramentoStatusBadge({ status }: { status: string | null }) {
  const config = STATUS_CONFIG[status ?? ''] ?? { ...FALLBACK_CONFIG, label: status ?? '—' };
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function MonitoramentoStatusSelectBadge({
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
  const [status, setStatus] = useState(initialStatus ?? '0_aguardando_rede');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      const res = await fetch(`/api/monitoramento/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao atualizar status');
      }
      return res.json();
    },
  });

  function handleValueChange(nextStatus: string | null) {
    if (!nextStatus) return;
    const previous = status;
    setStatus(nextStatus);
    mutation.mutate(nextStatus, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: (error) => {
        setStatus(previous);
        toast.error(error instanceof Error ? error.message : 'Falha ao atualizar status');
      },
    });
  }

  const config = STATUS_CONFIG[status] ?? { ...FALLBACK_CONFIG, label: status };

  if (!canEdit) {
    return <MonitoramentoStatusBadge status={status} />;
  }

  return (
    <SelectPrimitive.Root value={status} onValueChange={handleValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5',
          'text-xs font-medium whitespace-nowrap outline-none transition-opacity',
          'focus-visible:ring-2 focus-visible:ring-ring/50',
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
              'isolate z-50 min-w-[220px] overflow-hidden rounded-xl border border-border/70',
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
                    className="relative flex cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap outline-none select-none focus:bg-accent focus:text-accent-foreground"
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
