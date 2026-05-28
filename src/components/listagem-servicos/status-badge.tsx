'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  { value: 'nao_resolvido', label: 'Não Resolvido' },
  { value: 'resolvido', label: 'Resolvido' },
];

const TECHNICIAN_OPTIONS = ['Marlon', 'Azevedo', 'Outros'];

const PRIORITY_CONFIG: Record<string, { className: string }> = {
  '1': { className: 'h-2.5 w-2.5 rounded-full bg-red-500' },
  '2': { className: 'h-2.5 w-2.5 rounded-full bg-amber-400' },
  '-': { className: 'h-2.5 w-2.5 rounded-full bg-muted-foreground/40' },
};

type StatusMutationPayload = {
  status: string;
  technician?: string;
};

function TechnicianPickerDialog({
  open,
  isSaving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (technician: string) => void;
}) {
  const [technicianOption, setTechnicianOption] = useState('');
  const [customTechnician, setCustomTechnician] = useState('');
  const [error, setError] = useState('');

  const { data: dropdownOptionsData } = useQuery({
    queryKey: ['dropdown-options', 'status-badge-tecnicos'],
    queryFn: async () => {
      const res = await fetch('/api/dropdown-options?category=tecnicos');
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{ data: { category: string; value: string; label: string; sortOrder: number }[] }>;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const technicianOptionsPairs = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    TECHNICIAN_OPTIONS.forEach((opt) => map.set(opt, { value: opt, label: opt }));
    dropdownOptionsData?.data
      ?.filter((opt) => opt.category === 'tecnicos')
      .forEach((opt) => map.set(opt.value, { value: opt.value, label: opt.label }));

    return Array.from(map.values()).sort((a, b) => {
      if (a.value === 'Outros') return 1;
      if (b.value === 'Outros') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [dropdownOptionsData]);

  function handleCancel() {
    setTechnicianOption('');
    setCustomTechnician('');
    setError('');
    onCancel();
  }

  function handleConfirm() {
    const finalTechnician = technicianOption === 'Outros' ? customTechnician.trim() : technicianOption;
    if (!finalTechnician) {
      setError(technicianOption === 'Outros' ? 'Informe o nome do técnico.' : 'Selecione o técnico responsável.');
      return;
    }
    onConfirm(finalTechnician);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Técnico responsável</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="status-tech">Técnico responsável</Label>
            <Select
              value={technicianOption || null}
              onValueChange={(value) => {
                setTechnicianOption(value ?? '');
                if (value !== 'Outros') setCustomTechnician('');
                setError('');
              }}
            >
              <SelectTrigger id="status-tech" className="w-full">
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" className="max-h-[40vh] overflow-y-auto">
                {technicianOptionsPairs.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {technicianOption === 'Outros' && (
            <div className="space-y-1.5">
              <Label htmlFor="status-tech-custom">Informe o nome do técnico</Label>
              <Input
                id="status-tech-custom"
                value={customTechnician}
                onChange={(event) => {
                  setCustomTechnician(event.target.value);
                  setError('');
                }}
                placeholder="Nome do técnico"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [technicianDialogOpen, setTechnicianDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: StatusMutationPayload) => {
      const res = await fetch(`/api/listagem-servicos/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao atualizar status');
      }
      return res.json();
    },
  });

  const handleValueChange = (newStatus: string | null) => {
    if (newStatus === null) return;
    if (newStatus === 'tecnico_direcionado') {
      setPendingStatus('tecnico_direcionado');
      setTechnicianDialogOpen(true);
      return;
    }

    const prev = status;
    setStatus(newStatus);
    mutation.mutate({ status: newStatus }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: (error) => {
        setStatus(prev);
        toast.error(error instanceof Error ? error.message : 'Falha ao atualizar o status');
      },
    });
  };

  const handleTechnicianConfirm = (technician: string) => {
    if (pendingStatus !== 'tecnico_direcionado') return;
    const prev = status;
    setStatus('tecnico_direcionado');
    mutation.mutate(
      { status: 'tecnico_direcionado', technician },
      {
        onSuccess: () => {
          setTechnicianDialogOpen(false);
          setPendingStatus(null);
          queryClient.invalidateQueries({ queryKey });
        },
        onError: (error) => {
          setStatus(prev);
          toast.error(error instanceof Error ? error.message : 'Falha ao atualizar o status');
        },
      }
    );
  };

  const handleTechnicianCancel = () => {
    setTechnicianDialogOpen(false);
    setPendingStatus(null);
  };

  const config = STATUS_CONFIG[status] ?? { ...FALLBACK_CONFIG, label: status ?? '—' };

  if (!canEdit) {
    return <StatusBadge status={status} />;
  }

  if (status === 'resolvido') {
    return (
      <span
        title="Chamado já resolvido não pode ser reaberto. Crie um novo registro na listagem."
        className="inline-flex cursor-not-allowed"
      >
        <StatusBadge status={status} />
      </span>
    );
  }

  return (
    <>
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
      <TechnicianPickerDialog
        open={technicianDialogOpen}
        isSaving={mutation.isPending}
        onCancel={handleTechnicianCancel}
        onConfirm={handleTechnicianConfirm}
      />
    </>
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
