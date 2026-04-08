'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filters } from '@/components/atendimentos/filters';
import type { AtendimentoFilters } from '@/components/atendimentos/filters';
import { Columns } from '@/components/atendimentos/columns';
import { OsDetailSheet } from '@/components/atendimentos/os-detail-sheet';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSkeleton, StateDisplay, TableSkeleton } from '@/components/ui/state-display';

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

  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: '50',
    ...(filters.type && { type: filters.type }),
    ...(filters.slaStatus && { slaStatus: filters.slaStatus }),
    ...(filters.search && { search: filters.search }),
    ...(filters.city && { city: filters.city }),
    ...(filters.plan && { plan: filters.plan }),
    ...(filters.bairro && { bairro: filters.bairro }),
  });
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders', queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/service-orders?${queryParams.toString()}`);
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

  const table = useReactTable({
    data: data?.data || [],
    columns: Columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <PageLayout
      title="Atividades"
      description="Listagem de todas as ordens de serviço com filtros por período, tipo e status de SLA."
      actions={
        <div className="flex flex-wrap gap-3">
          <GlobalDateFilter />
          <Filters
            filters={filters}
            options={filterContract?.options}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1);
            }}
          />
        </div>
      }
    >
      <div className="rounded-xl border bg-card overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedOs(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Columns.length} className="h-64 align-middle">
                  <StateDisplay variant="empty" title="Nenhum atendimento" description="Não encontramos atendimentos com os filtros informados." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {data?.page || 1} de {data?.totalPages || 1} — {data?.data?.length || 0} de {data?.total || 0} registros
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === (data?.totalPages || 1) || isLoading}>
            Próximo
          </Button>
        </div>
      </div>

      <OsDetailSheet os={selectedOs} isOpen={!!selectedOs} onClose={() => setSelectedOs(null)} />
    </PageLayout>
  );
}

export default function AtendimentosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AtendimentosPageContent />
    </Suspense>
  );
}
