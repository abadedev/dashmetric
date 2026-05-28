'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StateDisplay, TableSkeleton } from '@/components/ui/state-display';
import type { MonitoramentoItem } from '@/lib/db/infra-schema';
import type { ModuleAccessLevel } from '@/lib/module-access';
import { cn } from '@/lib/utils';
import { MonitoramentoStatusSelectBadge } from './monitoramento-status-badge';

interface MonitoramentoTableProps {
  data: MonitoramentoItem[] | undefined;
  isLoading: boolean;
  moduleAccessLevel: ModuleAccessLevel;
  queryKey: readonly unknown[];
  onViewDetail: (record: MonitoramentoItem) => void;
  onEdit: (record: MonitoramentoItem) => void;
}

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  const [year, month, day] = date.split('-');
  return day && month && year ? `${day}/${month}/${year}` : date;
}

function daysSince(date: string | null | undefined) {
  if (!date) return 0;
  const start = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayStart.getTime() - start.getTime()) / 86_400_000));
}

function tempoAberto(date: string | null | undefined) {
  const days = daysSince(date);
  if (days === 0) {
    return { label: 'Hoje', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' };
  }
  if (days <= 1) {
    return { label: `${days}d`, className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' };
  }
  if (days <= 3) {
    return { label: `${days}d`, className: 'border-orange-500/30 bg-orange-500/10 text-orange-400' };
  }
  return { label: `${days}d`, className: 'border-red-500/30 bg-red-500/10 text-red-400' };
}

function AtendToggle({
  record,
  canManage,
  queryKey,
}: {
  record: MonitoramentoItem;
  canManage: boolean;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch(`/api/monitoramento/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atendAberto: value }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar atendimento.');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const isOpen = record.atendAberto === true;

  if (!canManage) {
    return (
      <Badge variant={isOpen ? 'default' : 'outline'} className="min-w-[52px] justify-center">
        {isOpen ? 'Sim' : 'Não'}
      </Badge>
    );
  }

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!isOpen)}
      className="disabled:opacity-70"
    >
      <Badge variant={isOpen ? 'default' : 'outline'} className="min-w-[52px] cursor-pointer justify-center">
        {mutation.isPending ? '...' : isOpen ? 'Sim' : 'Não'}
      </Badge>
    </button>
  );
}

function DeleteConfirmDialog({
  recordId,
  open,
  onClose,
  queryKey,
}: {
  recordId: number | null;
  open: boolean;
  onClose: () => void;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/monitoramento/${recordId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir registro.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir registro?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonitoramentoTable({
  data,
  isLoading,
  moduleAccessLevel,
  queryKey,
  onViewDetail,
  onEdit,
}: MonitoramentoTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const canEditStatus = moduleAccessLevel === 'editor' || moduleAccessLevel === 'admin';
  const canManage = moduleAccessLevel === 'admin';

  if (isLoading) return <TableSkeleton />;

  const rows = data ?? [];
  if (rows.length === 0) {
    return <StateDisplay variant="empty" description="Nenhum registro encontrado para os filtros selecionados." />;
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-[1180px] [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">Tempo</TableHead>
              <TableHead className="w-[86px]">Data</TableHead>
              <TableHead className="w-[130px]">Área</TableHead>
              <TableHead className="w-[220px]">Cliente</TableHead>
              <TableHead className="w-[120px]">Rede</TableHead>
              <TableHead className="w-[110px]">Problema</TableHead>
              <TableHead className="w-[90px]">Sensor</TableHead>
              <TableHead className="w-[54px] text-right">Qtd</TableHead>
              <TableHead className="w-[210px]">Status</TableHead>
              <TableHead className="w-[78px]">Atend.</TableHead>
              <TableHead className="w-[92px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const tempo = tempoAberto(row.dataPostagem);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className={cn('inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums', tempo.className)}>
                      {tempo.label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(row.dataPostagem)}</TableCell>
                  <TableCell className="max-w-[130px] text-xs">
                    <span className="block truncate" title={row.areaCity ?? ''}>{row.areaCity || '—'}</span>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium" title={row.cliente ?? ''}>{row.cliente || '—'}</p>
                      <p className="truncate text-[11px] text-muted-foreground" title={row.login ?? ''}>{row.login || ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px] text-xs">
                    <span className="block truncate" title={row.rede ?? ''}>{row.rede || '—'}</span>
                  </TableCell>
                  <TableCell>
                    {row.problema ? (
                      <Badge variant="outline" className="text-[11px]">{row.problema}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{row.sensor || '—'}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{row.qtdDesconexao ?? ''}</TableCell>
                  <TableCell>
                    <MonitoramentoStatusSelectBadge
                      status={row.status}
                      recordId={row.id}
                      queryKey={queryKey}
                      canEdit={canEditStatus}
                    />
                  </TableCell>
                  <TableCell>
                    <AtendToggle record={row} canManage={canManage} queryKey={queryKey} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalhes" onClick={() => onViewDetail(row)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canManage && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => onEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        recordId={deleteId}
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        queryKey={queryKey}
      />
    </>
  );
}
