'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Pencil, RefreshCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InfraSlaConfig } from '@/lib/db/schema';

interface SlaConfigResponse {
  data: InfraSlaConfig[];
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString('pt-BR');
}

export function SlaConfigManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery<SlaConfigResponse>({
    queryKey: ['admin', 'sla-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sla-config');
      if (!res.ok) throw new Error('Falha ao carregar SLA');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { prioridade: number; metaHoras: number }) => {
      const res = await fetch('/api/admin/sla-config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Falha ao salvar.');
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sla-config'] });
      qc.invalidateQueries({ queryKey: ['sla-config'] });
      qc.invalidateQueries({ queryKey: ['infrastructure-dashboard'] });
      toast.success('Meta de SLA atualizada.');
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/sla-config/recalcular', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Falha ao recalcular.');
      return json as { atualizados: number; total: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['listagem-servicos'] });
      qc.invalidateQueries({ queryKey: ['infrastructure-dashboard'] });
      toast.success(
        `Recalculado: ${data.atualizados} ${data.atualizados === 1 ? 'registro' : 'registros'} de ${data.total} atualizado${data.atualizados === 1 ? '' : 's'}.`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function startEdit(row: InfraSlaConfig) {
    setEditing(row.prioridade);
    setEditValue(String(row.metaHoras));
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  function save(prioridade: number) {
    const metaHoras = Number(editValue);
    if (!Number.isFinite(metaHoras) || metaHoras < 1 || metaHoras > 8760) {
      toast.error('Informe um valor entre 1 e 8760 horas.');
      return;
    }
    updateMutation.mutate({ prioridade, metaHoras });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>SLA de Infraestrutura</CardTitle>
          <CardDescription>
            Metas em horas corridas por prioridade. Aplicam-se à Listagem de Serviços e ao dashboard de Infraestrutura.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={recalcMutation.isPending}
          onClick={() => recalcMutation.mutate()}
        >
          {recalcMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Recalcular SLA histórico
        </Button>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Prioridade</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Meta (horas)</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead>Por</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sem configurações.
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((row) => {
                const isEditing = editing === row.prioridade;
                return (
                  <TableRow key={row.prioridade}>
                    <TableCell className="font-mono text-sm">P{row.prioridade}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={1}
                          max={8760}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="ml-auto w-24 text-right tabular-nums"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') save(row.prioridade);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <span className="tabular-nums">{row.metaHoras}h</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(row.updatedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.updatedBy ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8 p-0"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => save(row.prioridade)}
                            disabled={updateMutation.isPending}
                            className="h-8 gap-1.5 px-2.5"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(row)}
                          className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
