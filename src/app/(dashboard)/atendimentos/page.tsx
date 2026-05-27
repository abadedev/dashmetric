'use client';

import { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filters } from '@/components/atendimentos/filters';
import type { AtendimentoFilters } from '@/components/atendimentos/filters';
import { Columns } from '@/components/atendimentos/columns';
import { OsDetailSheet } from '@/components/atendimentos/os-detail-sheet';
import { SlaPorTipo } from '@/components/atendimentos/sla-por-tipo';
import { SolucaoBreakdown } from '@/components/atendimentos/solucao-breakdown';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSkeleton, StateDisplay, TableSkeleton } from '@/components/ui/state-display';
import { TablePagination } from '@/components/atendimentos/table-pagination';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/utils/format';

function MetricCard({
  label,
  value,
  subtitle,
  valueClass,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className={cn('text-2xl font-semibold tabular-nums', valueClass)}>
        {value}
      </span>
      {subtitle && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

function AtendimentosPageContent() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AtendimentoFilters>({
    type: '',
    slaStatus: '',
    search: '',
    city: '',
    plan: '',
    bairro: '',
  });
  const [selectedOs, setSelectedOs] = useState<any | null>(null);

  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);

  // Base params shared by main + stats queries (no page, no slaStatus)
  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.type)   p.set('type', filters.type);
    if (filters.search) p.set('search', filters.search);
    if (filters.city)   p.set('city', filters.city);
    if (filters.plan)   p.set('plan', filters.plan);
    if (filters.bairro) p.set('bairro', filters.bairro);
    if (from) p.set('from', from.toISOString());
    if (to)   p.set('to', to.toISOString());
    return p.toString();
  }, [filters.type, filters.search, filters.city, filters.plan, filters.bairro, from, to]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams(baseParams);
    p.set('page', String(page));
    p.set('pageSize', '50');
    if (filters.slaStatus) p.set('slaStatus', filters.slaStatus);
    return p.toString();
  }, [baseParams, page, filters.slaStatus]);

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/service-orders?${queryParams}`);
      if (!res.ok) throw new Error(`service-orders error: ${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const { data: filterContract } = useQuery({
    queryKey: ['module-filters', 'attendances'],
    queryFn: async () => {
      const res = await fetch('/api/module-filters/attendances');
      if (!res.ok) throw new Error(`module-filters error: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const { data: clientesAtivosData } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: async () => {
      const res = await fetch('/api/intranet/clientes-ativos');
      if (!res.ok) throw new Error('clientes-ativos error');
      return res.json() as Promise<{ total: number; source: string }>;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const clientesAtivos = clientesAtivosData?.total ?? 24803;

  const supportParams = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from.toISOString());
    if (to)   p.set('to', to.toISOString());
    return p.toString();
  }, [from, to]);

  const { data: supportData } = useQuery({
    queryKey: ['support-records', supportParams],
    queryFn: async () => {
      const res = await fetch(`/api/support-records?${supportParams}`);
      if (!res.ok) throw new Error('support-records error');
      return res.json() as Promise<{ total: number }>;
    },
    retry: false,
  });
  const totalSuporteNoPeriodo = supportData?.total ?? 0;
  const inrSuporte = totalSuporteNoPeriodo > 0 ? (totalSuporteNoPeriodo / clientesAtivos) * 100 : null;

  const inrReparosVisible = data?.inrReparos != null;
  const inrSuporteVisible = inrSuporte != null;
  const metricCols = 3 + (inrReparosVisible ? 1 : 0) + (inrSuporteVisible ? 1 : 0);

  const table = useReactTable({
    data: data?.data || [],
    columns: Columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
    <PageLayout
      title="Atividades"
      description="Listagem de todas as ordens de serviço com filtros por período, tipo e status de SLA."
      actions={<GlobalDateFilter />}
    >
      {/* Metric cards */}
      <div
        className={cn(
          'grid gap-4',
          metricCols === 3 && 'grid-cols-3',
          metricCols === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
          metricCols === 5 && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        )}
      >
        <MetricCard label="Total de OS" value={data?.total ?? '—'} />
        <MetricCard
          label="Dentro da meta"
          value={data?.withinSla ?? data?.withinSlaCorrido ?? '—'}
          subtitle={data?.slaPercent != null ? `${formatPercent(data.slaPercent)} dentro da meta` : undefined}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          label="Fora da meta"
          value={data?.outsideSla ?? data?.outsideSlaCorrido ?? '—'}
          subtitle={data?.total ? `${formatPercent((data.outsideSla ?? data.outsideSlaCorrido ?? 0) / data.total)} fora da meta` : undefined}
          valueClass="text-red-500 dark:text-red-400"
        />
        {inrReparosVisible && (
          <MetricCard
            label="INR Reparos"
            value={(data.inrReparos as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            subtitle={`Reparos: ${data.totalReparos} / Base ativa: ${clientesAtivos.toLocaleString('pt-BR')}`}
          />
        )}
        {inrSuporte != null && (
          <MetricCard
            label="INR Suporte"
            value={inrSuporte.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            subtitle={`Suporte: ${totalSuporteNoPeriodo} / Base ativa: ${clientesAtivos.toLocaleString('pt-BR')}`}
          />
        )}
      </div>

      {/* SLA por tipo de atividade */}
      <SlaPorTipo data={data?.slaByType} />

      {/* Classificação de solução dos reparos */}
      <SolucaoBreakdown data={data?.data} type={filters.type} />

      {/* Filters bar */}
      <div className="rounded-xl border bg-card px-4 py-3">
        <Filters
          filters={filters}
          options={filterContract?.options}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-10"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={Columns.length} className="h-64 align-top">
                  <TableSkeleton />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setSelectedOs(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Columns.length} className="h-64 align-middle">
                  <StateDisplay
                    variant="empty"
                    title="Nenhum atendimento"
                    description="Não encontramos atendimentos com os filtros informados."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* spacer so the fixed pagination bar doesn't overlap the last table row */}
      <div className="h-14" aria-hidden="true" />

      <OsDetailSheet os={selectedOs} isOpen={!!selectedOs} onClose={() => setSelectedOs(null)} />
    </PageLayout>

    <TablePagination
      page={page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      isLoading={isLoading}
      onPrev={() => setPage((p) => Math.max(1, p - 1))}
      onNext={() => setPage((p) => p + 1)}
    />
    </>
  );
}

export default function AtendimentosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AtendimentosPageContent />
    </Suspense>
  );
}
