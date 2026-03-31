'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filters } from '@/components/atendimentos/filters';
import { Columns } from '@/components/atendimentos/columns';
import { OsDetailSheet } from '@/components/atendimentos/os-detail-sheet';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function AtendimentosPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    slaStatus: '',
    search: '',
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
  });
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders', queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/service-orders?${queryParams.toString()}`);
      return res.json();
    },
  });

  const table = useReactTable({
    data: data?.data || [],
    columns: Columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <GlobalDateFilter />
        <Filters
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1); // reset page on filter change
          }}
        />
      </div>

      <div className="rounded-md border bg-card flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={Columns.length} className="h-24 text-center">
                  <div className="space-y-4 px-4"><Skeleton className="h-8 w-full"/><Skeleton className="h-8 w-full"/></div>
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
                <TableCell colSpan={Columns.length} className="h-24 text-center">
                  Nenhum atendimento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {data?.page || 1} de {data?.totalPages || 1} — Mostrando{' '}
          {data?.data?.length || 0} de {data?.total || 0} registros
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === (data?.totalPages || 1) || isLoading}
          >
            Próximo
          </Button>
        </div>
      </div>

      <OsDetailSheet
        os={selectedOs}
        isOpen={!!selectedOs}
        onClose={() => setSelectedOs(null)}
      />
    </div>
  );
}
