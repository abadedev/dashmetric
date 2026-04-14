'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Download, MapPin, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TableSkeleton, StateDisplay } from '@/components/ui/state-display';
import { FinalizeDialog } from './finalize-dialog';
import { ServiceForm } from './service-form';
import { ShareOsMessageButton } from './share-os-message-button';
import { PriorityDot, StatusBadge } from './status-badge';
import type { ServiceListing } from '@/lib/db/infra-schema';
import type { AppRole } from '@/lib/services/module-service';

interface ServiceListingsTableProps {
  data: ServiceListing[] | undefined;
  isLoading: boolean;
  userRole: AppRole;
  queryKey: readonly unknown[];
  sortField: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  queryString: string;
  activeTab: 'pendentes' | 'resolvidos';
  onTabChange: (tab: 'pendentes' | 'resolvidos') => void;
  totalPendentes: number;
  totalResolvidos: number;
}

const PENDING_STATUSES = new Set(['pendente', 'em_andamento', 'tecnico_direcionado']);

function formatDate(date: string | null | undefined) {
  if (!date) return '\u2014';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function AddressCell({ row }: { row: ServiceListing }) {
  const address = row.address || '\u2014';

  if (!row.locationUrl) {
    return <span className="block truncate" title={row.address ?? ''}>{address}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="truncate" title={row.address ?? ''}>{address}</span>
      <a
        href={row.locationUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={'Abrir localiza\u00E7\u00E3o'}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <MapPin className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function OccurrenceCell({ row }: { row: ServiceListing }) {
  return (
    <div className="space-y-1">
      <p className="line-clamp-2 text-xs font-medium text-foreground" title={row.tipoOcorrencia}>
        {row.tipoOcorrencia}
      </p>
      <p className="line-clamp-2 text-[11px] text-muted-foreground" title={row.observacaoInfra ?? row.problem ?? ''}>
        {row.observacaoInfra || row.problem || '\u2014'}
      </p>
    </div>
  );
}

function OccurrenceToggle({
  record,
  canEdit,
  queryKey,
}: {
  record: ServiceListing;
  canEdit: boolean;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch(`/api/listagem-servicos/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurrenceCreated: value }),
      });
      if (!res.ok) throw new Error('Falha');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <input
      type="checkbox"
      checked={record.occurrenceCreated ?? false}
      disabled={!canEdit || mutation.isPending}
      onChange={(event) => mutation.mutate(event.target.checked)}
      className="h-4 w-4 rounded border-border cursor-pointer disabled:cursor-default"
    />
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
      const res = await fetch(`/api/listagem-servicos/${recordId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha');
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
        <p className="text-sm text-muted-foreground">{'Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita.'}</p>
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

function calcularTempoAberto(referenceDate: string): { texto: string; cor: string } {
  const inicio = new Date(referenceDate);
  const agora = new Date();
  const dias = Math.floor((agora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  if (dias === 0) return { texto: 'Hoje', cor: 'text-green-500' };
  if (dias <= 4) return { texto: `${dias}d`, cor: 'text-yellow-500' };
  if (dias <= 7) return { texto: `${dias}d`, cor: 'text-orange-500' };
  return { texto: `${dias}d`, cor: 'text-red-500' };
}

async function exportarCSV(queryString: string) {
  const res = await fetch(`/api/listagem-servicos?${queryString}&pageSize=9999`);
  const json = (await res.json()) as { data: ServiceListing[] };
  const dados = json.data ?? [];

  const headers = ['Data', 'Prioridade', 'Tecnologia', 'Cidade', 'Endereço',
    'Rede/Caixa', 'Ocorrência', 'Observação', 'Status', 'Técnico', 'Solução', 'Data Conclusão'];

  const linhas = dados.map((r) =>
    [r.referenceDate, r.priority, r.technology, r.cityArea, r.address,
     r.networkBox, r.tipoOcorrencia, r.observacaoInfra, r.status,
     r.technician, r.solution, r.resolutionDate]
      .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
      .join(',')
  );

  const csv = [headers.join(','), ...linhas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listagem-servicos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortField !== field) return <span className="ml-1 opacity-0 group-hover:opacity-50">↕</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function RecordsTable({
  rows,
  userRole,
  queryKey,
  onFinalize,
  onEdit,
  onDelete,
  sortField,
  sortDir,
  onSort,
  showTempoAberto,
}: {
  rows: ServiceListing[];
  userRole: AppRole;
  queryKey: readonly unknown[];
  onFinalize: (record: ServiceListing) => void;
  onEdit: (record: ServiceListing) => void;
  onDelete: (id: number) => void;
  sortField: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  showTempoAberto: boolean;
}) {
  const canEdit = userRole === 'editor' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  if (rows.length === 0) {
    return (
      <StateDisplay
        variant="empty"
        description="Nenhum registro encontrado para os filtros selecionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="group w-8 cursor-pointer select-none hover:text-foreground"
              onClick={() => onSort('priority')}
            >
              P<SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="group cursor-pointer select-none whitespace-nowrap hover:text-foreground"
              onClick={() => onSort('referenceDate')}
            >
              Data<SortIcon field="referenceDate" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            <TableHead>Tec.</TableHead>
            <TableHead
              className="group cursor-pointer select-none hover:text-foreground"
              onClick={() => onSort('cityArea')}
            >
              {'Cidade / \u00C1rea'}<SortIcon field="cityArea" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            <TableHead>{'Endere\u00E7o'}</TableHead>
            <TableHead
              className="group cursor-pointer select-none hover:text-foreground"
              onClick={() => onSort('networkBox')}
            >
              Rede/Caixa<SortIcon field="networkBox" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            <TableHead>Ocorrencia</TableHead>
            <TableHead
              className="group cursor-pointer select-none hover:text-foreground"
              onClick={() => onSort('status')}
            >
              Status<SortIcon field="status" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            {showTempoAberto && <TableHead className="whitespace-nowrap">Em aberto</TableHead>}
            <TableHead
              className="group cursor-pointer select-none hover:text-foreground"
              onClick={() => onSort('technician')}
            >
              {'T\u00E9cnico'}<SortIcon field="technician" sortField={sortField} sortDir={sortDir} />
            </TableHead>
            <TableHead className="w-8 text-center">OC</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell><PriorityDot priority={row.priority} /></TableCell>
              <TableCell className="whitespace-nowrap text-xs">{formatDate(row.referenceDate)}</TableCell>
              <TableCell className="text-xs font-medium">{row.technology || '\u2014'}</TableCell>
              <TableCell className="max-w-[140px] truncate text-xs" title={row.cityArea ?? ''}>{row.cityArea || '\u2014'}</TableCell>
              <TableCell className="max-w-[180px] text-xs">
                <AddressCell row={row} />
              </TableCell>
              <TableCell className="max-w-[150px] truncate text-xs" title={row.networkBox ?? ''}>{row.networkBox || '\u2014'}</TableCell>
              <TableCell className="max-w-[240px]">
                <OccurrenceCell row={row} />
              </TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              {showTempoAberto && (() => {
                const { texto, cor } = calcularTempoAberto(row.referenceDate);
                return <TableCell className={`whitespace-nowrap text-xs font-medium ${cor}`}>{texto}</TableCell>;
              })()}
              <TableCell className="whitespace-nowrap text-xs">{row.technician || '\u2014'}</TableCell>
              <TableCell className="text-center">
                <OccurrenceToggle record={row} canEdit={canEdit} queryKey={queryKey} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {canEdit && PENDING_STATUSES.has(row.status ?? '') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                      title="Finalizar"
                      onClick={() => onFinalize(row)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ShareOsMessageButton record={row} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Excluir"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ServiceListingsTable({
  data,
  isLoading,
  userRole,
  queryKey,
  sortField,
  sortDir,
  onSort,
  searchValue,
  onSearchChange,
  queryString,
  activeTab,
  onTabChange,
  totalPendentes,
  totalResolvidos,
}: ServiceListingsTableProps) {
  const [finalizeRecord, setFinalizeRecord] = useState<ServiceListing | null>(null);
  const [editRecord, setEditRecord] = useState<ServiceListing | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [inputValue, setInputValue] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(searchValue);
  }, [searchValue]);

  function handleSearchInput(val: string) {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(val), 400);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportarCSV(queryString);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) return <TableSkeleton />;

  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por endereço ou CA..."
          value={inputValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto"
        >
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'pendentes' | 'resolvidos')}>
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes
            {totalPendentes > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">
                {totalPendentes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolvidos">
            Resolvidos
            {totalResolvidos > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                {totalResolvidos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chamados pendentes</CardTitle>
              <CardDescription>{'Registros aguardando atendimento ou resolu\u00E7\u00E3o.'}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <RecordsTable
                rows={data ?? []}
                userRole={userRole}
                queryKey={queryKey}
                onFinalize={setFinalizeRecord}
                onEdit={setEditRecord}
                onDelete={setDeleteId}
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
                showTempoAberto
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolvidos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chamados resolvidos</CardTitle>
              <CardDescription>{'Registros finalizados com solu\u00E7\u00E3o registrada.'}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <RecordsTable
                rows={data ?? []}
                userRole={userRole}
                queryKey={queryKey}
                onFinalize={setFinalizeRecord}
                onEdit={setEditRecord}
                onDelete={setDeleteId}
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
                showTempoAberto={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FinalizeDialog
        record={finalizeRecord}
        open={!!finalizeRecord}
        onClose={() => setFinalizeRecord(null)}
        queryKey={queryKey}
      />

      <ServiceForm
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        queryKey={queryKey}
        editRecord={editRecord}
      />

      <DeleteConfirmDialog
        recordId={deleteId}
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        queryKey={queryKey}
      />
    </>
  );
}
