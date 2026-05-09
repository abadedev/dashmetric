'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/state-display';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceListingsTable } from '@/components/listagem-servicos/service-listings-table';
import { ServiceForm } from '@/components/listagem-servicos/service-form';
import type { ServiceListing, ServiceListingWithStats } from '@/lib/db/infra-schema';
import { INFRA_OCCURRENCE_OPTIONS } from '@/lib/listagem-servicos/infra-occurrences';
import type { ModuleAccessLevel } from '@/lib/module-access';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'tecnico_direcionado', label: 'Técnico Direcionado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'resolvido', label: 'Resolvido' },
] as const;

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function ListagemServicosContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
  const [city, setCity] = useQueryState('city');
  const [technician, setTechnician] = useQueryState('technician');
  const [tipoOcorrencia, setTipoOcorrencia] = useQueryState('tipoOcorrencia');
  const [occurrenceCreated, setOccurrenceCreated] = useQueryState('occurrenceCreated');
  const [statusFilter, setStatusFilter] = useQueryState('statusFilter');
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });

  const [activeTab, setActiveTab] = useState<'pendentes' | 'resolvidos'>('pendentes');
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleTabChange(tab: 'pendentes' | 'resolvidos') {
    setActiveTab(tab);
    setPage('1');
  }

  function handleSort(field: string, initialDir: 'asc' | 'desc' = 'asc') {
    if (sortField === field) {
      if (sortDir === initialDir) {
        setSortDir(initialDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir(initialDir);
    }
  }

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString().slice(0, 10));
  if (to) queryParams.set('to', to.toISOString().slice(0, 10));
  if (city && city !== 'all') queryParams.set('city', city);
  if (technician && technician !== 'all') queryParams.set('technician', technician);
  if (tipoOcorrencia && tipoOcorrencia !== 'all') queryParams.set('tipoOcorrencia', tipoOcorrencia);
  if (occurrenceCreated && occurrenceCreated !== 'all') queryParams.set('occurrenceCreated', occurrenceCreated);
  // When a specific status is selected use it directly; otherwise fall back to the active tab grouping.
  const effectiveStatus = statusFilter && statusFilter !== '' ? statusFilter : activeTab;
  queryParams.set('status', effectiveStatus);
  queryParams.set('page', page ?? '1');
  queryParams.set('pageSize', '100');
  if (sortField) {
    queryParams.set('sort', sortField);
    queryParams.set('dir', sortDir);
  }
  if (searchQuery) queryParams.set('search', searchQuery);
  const qs = queryParams.toString();

  const queryKey = ['listagem-servicos', qs] as const;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/listagem-servicos?${qs}`);
      return res.json() as Promise<{
        data: ServiceListingWithStats[];
        total: number;
        totalPendentes: number;
        totalResolvidos: number;
        totalPages: number;
        page: number;
        pageSize: number;
        cities: string[];
        technicians: string[];
        occurrenceTypes: string[];
        openAgeOptions: string[];
        moduleAccessLevel: ModuleAccessLevel;
      }>;
    },
  });

  const moduleAccessLevel = data?.moduleAccessLevel ?? 'none';
  const canEdit = moduleAccessLevel === 'editor' || moduleAccessLevel === 'admin';
  const totalPages = data?.totalPages ?? 1;
  const currentPage = parseInt(page ?? '1', 10);
  const hasActiveFilters = Boolean(
    from ||
    to ||
    (city && city !== 'all') ||
    (technician && technician !== 'all') ||
    (tipoOcorrencia && tipoOcorrencia !== 'all') ||
    (occurrenceCreated && occurrenceCreated !== 'all') ||
    (statusFilter && statusFilter !== '') ||
    searchQuery ||
    sortField
  );

  function clearFilters() {
    setCity(null);
    setTechnician(null);
    setTipoOcorrencia(null);
    setOccurrenceCreated(null);
    setStatusFilter(null);
    setSearchQuery('');
    setSortField(null);
    setSortDir('asc');
    setPage('1');
  }

  return (
    <PageLayout
      fullWidth
      title={'Listagem de serviços'}
      description={'Controle operacional diário de chamados de infraestrutura de rede.'}
    >
      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4 mb-4">
        <div className="flex flex-col gap-1">
          <FilterLabel>Ocorrência</FilterLabel>
          <Select
            value={tipoOcorrencia || 'all'}
            onValueChange={(value) => { setTipoOcorrencia(value === 'all' ? null : value); setPage('1'); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todas' : v}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as ocorrências</SelectItem>
              {(data?.occurrenceTypes ?? INFRA_OCCURRENCE_OPTIONS).map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Status</FilterLabel>
          <Select
            value={statusFilter || ''}
            onValueChange={(value) => { setStatusFilter(value === '' ? null : value); setPage('1'); }}
          >
            <SelectTrigger className="w-max min-w-[200px] max-w-full">
              <SelectValue placeholder="Todos">
                {(v: string | null) => {
                  if (!v || v === '') return 'Todos';
                  return STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false} className="min-w-[200px]">
              <SelectItem value="">Todos</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Técnico</FilterLabel>
          <Select
            value={technician || 'all'}
            onValueChange={(value) => { setTechnician(value === 'all' ? null : value); setPage('1'); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todos' : v}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {(data?.technicians ?? []).map((item) => (
                <SelectItem key={item} value={item} className="capitalize">{item?.toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Cidade</FilterLabel>
          <Select
            value={city || 'all'}
            onValueChange={(value) => { setCity(value === 'all' ? null : value); setPage('1'); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todas' : v?.replace(/_/g, ' ')}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {(data?.cities ?? []).map((item) => (
                <SelectItem key={item} value={item ?? ''}>{(item ?? '').replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>OC aberta</FilterLabel>
          <Select
            value={occurrenceCreated || 'all'}
            onValueChange={(value) => { setOccurrenceCreated(value === 'all' ? null : value); setPage('1'); }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue>{(v: string | null) => v === 'true' ? 'Sim' : v === 'false' ? 'Não' : 'Todos'}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Período</FilterLabel>
          <GlobalDateFilter noDefault />
        </div>

        <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
          Limpar filtros
        </Button>

        <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>

        {canEdit && (
          <Button onClick={() => setNewFormOpen(true)} className="ml-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo registro
          </Button>
        )}
      </div>

      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{data.total}</strong> registros encontrados
          </span>
          {totalPages > 1 && (
            <span>
              Página <strong className="text-foreground">{currentPage}</strong> de{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
          )}
        </div>
      )}

      <ServiceListingsTable
        data={data?.data}
        isLoading={isLoading}
        moduleAccessLevel={moduleAccessLevel}
        queryKey={queryKey}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage('1'); }}
        queryString={qs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalPendentes={data?.totalPendentes ?? 0}
        totalResolvidos={data?.totalResolvidos ?? 0}
      />

      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(String(currentPage - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(String(currentPage + 1))}
            >
              Próxima
            </Button>
          </CardContent>
        </Card>
      )}

      <ServiceForm
        open={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        queryKey={queryKey}
        moduleAccessLevel={moduleAccessLevel}
      />
    </PageLayout>
  );
}

export default function ListagemServicosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ListagemServicosContent />
    </Suspense>
  );
}
