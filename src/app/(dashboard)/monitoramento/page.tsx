'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/state-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonitoramentoDetailDialog } from '@/components/monitoramento/monitoramento-detail-dialog';
import { MonitoramentoForm } from '@/components/monitoramento/monitoramento-form';
import { MonitoramentoTable } from '@/components/monitoramento/monitoramento-table';
import type { MonitoramentoItem } from '@/lib/db/infra-schema';
import type { ModuleAccessLevel } from '@/lib/module-access';
import { PROBLEMA_OPTIONS, SENSOR_OPTIONS, STATUS_OPTIONS } from '@/lib/monitoramento/constants';

function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function MonitoramentoContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
  const [areaCity, setAreaCity] = useQueryState('areaCity');
  const [problema, setProblema] = useQueryState('problema');
  const [sensor, setSensor] = useQueryState('sensor');
  const [status, setStatus] = useQueryState('status');
  const [search, setSearch] = useQueryState('search');
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });

  const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos'>('ativos');
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MonitoramentoItem | null>(null);
  const [editRecord, setEditRecord] = useState<MonitoramentoItem | null>(null);

  function resetPage() {
    setPage('1');
  }

  function handleTabChange(tab: 'ativos' | 'concluidos') {
    setActiveTab(tab);
    resetPage();
  }

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString().slice(0, 10));
  if (to) queryParams.set('to', to.toISOString().slice(0, 10));
  if (areaCity && areaCity !== 'all') queryParams.set('areaCity', areaCity);
  if (problema && problema !== 'all') queryParams.set('problema', problema);
  if (sensor && sensor !== 'all') queryParams.set('sensor', sensor);
  if (status && status !== 'all') queryParams.set('status', status);
  if (search) queryParams.set('search', search);
  queryParams.set('page', page ?? '1');
  queryParams.set('pageSize', '100');
  queryParams.set('tab', activeTab);
  const qs = queryParams.toString();
  const queryKey = ['monitoramento', qs] as const;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/monitoramento?${qs}`);
      if (!res.ok) throw new Error('Falha ao carregar monitoramento');
      return res.json() as Promise<{
        data: MonitoramentoItem[];
        total: number;
        totalAtivos: number;
        totalConcluidos: number;
        totalPages: number;
        page: number;
        pageSize: number;
        areas: string[];
        moduleAccessLevel: ModuleAccessLevel;
      }>;
    },
  });

  const moduleAccessLevel = data?.moduleAccessLevel ?? 'none';
  const canCreate = moduleAccessLevel === 'editor' || moduleAccessLevel === 'admin';
  const totalPages = data?.totalPages ?? 1;
  const currentPage = parseInt(page ?? '1', 10);
  const hasActiveFilters = Boolean(
    from ||
    to ||
    (areaCity && areaCity !== 'all') ||
    (problema && problema !== 'all') ||
    (sensor && sensor !== 'all') ||
    (status && status !== 'all') ||
    search
  );

  function clearFilters() {
    setAreaCity(null);
    setProblema(null);
    setSensor(null);
    setStatus(null);
    setSearch(null);
    setPage('1');
  }

  return (
    <PageLayout
      fullWidth
      title="Monitoramento N2"
      description="Acompanhamento de casos N2, clientes intermitentes e eventos de rede."
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <FilterLabel>Busca</FilterLabel>
          <Input
            value={search ?? ''}
            onChange={(event) => { setSearch(event.target.value || null); resetPage(); }}
            placeholder="Cliente, login ou rede..."
            className="w-full sm:w-[260px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Área</FilterLabel>
          <Select value={areaCity || 'all'} onValueChange={(value) => { setAreaCity(value === 'all' ? null : value); resetPage(); }}>
            <SelectTrigger className="w-[190px]">
              <SelectValue>{(value: string | null) => value === 'all' || !value ? 'Todas' : value}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas</SelectItem>
              {(data?.areas ?? []).map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Problema</FilterLabel>
          <Select value={problema || 'all'} onValueChange={(value) => { setProblema(value === 'all' ? null : value); resetPage(); }}>
            <SelectTrigger className="w-[170px]">
              <SelectValue>{(value: string | null) => value === 'all' || !value ? 'Todos' : value}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todos</SelectItem>
              {PROBLEMA_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Sensor</FilterLabel>
          <Select value={sensor || 'all'} onValueChange={(value) => { setSensor(value === 'all' ? null : value); resetPage(); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue>{(value: string | null) => value === 'all' || !value ? 'Todos' : value}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todos</SelectItem>
              {SENSOR_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FilterLabel>Status</FilterLabel>
          <Select value={status || 'all'} onValueChange={(value) => { setStatus(value === 'all' ? null : value); resetPage(); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue>
                {(value: string | null) => value === 'all' || !value ? 'Todos' : STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false} className="min-w-[220px]">
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
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

        {canCreate && (
          <Button onClick={() => setNewFormOpen(true)} className="ml-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo
          </Button>
        )}
      </div>

      {data && (
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
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

      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'ativos' | 'concluidos')} className="w-full">
        <TabsList>
          <TabsTrigger value="ativos">
            Ativos
            {(data?.totalAtivos ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">
                {data?.totalAtivos}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="concluidos">
            Concluídos
            {(data?.totalConcluidos ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                {data?.totalConcluidos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Casos ativos</CardTitle>
              <CardDescription>Registros em acompanhamento pelo N2.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <MonitoramentoTable
                data={data?.data}
                isLoading={isLoading}
                moduleAccessLevel={moduleAccessLevel}
                queryKey={queryKey}
                onViewDetail={setSelectedRecord}
                onEdit={setEditRecord}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concluidos" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Casos concluídos</CardTitle>
              <CardDescription>Registros encerrados pelo N2.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <MonitoramentoTable
                data={data?.data}
                isLoading={isLoading}
                moduleAccessLevel={moduleAccessLevel}
                queryKey={queryKey}
                onViewDetail={setSelectedRecord}
                onEdit={setEditRecord}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <MonitoramentoForm
        open={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        queryKey={queryKey}
        moduleAccessLevel={moduleAccessLevel}
      />
      <MonitoramentoForm
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        queryKey={queryKey}
        editRecord={editRecord}
        moduleAccessLevel={moduleAccessLevel}
      />
      <MonitoramentoDetailDialog
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </PageLayout>
  );
}

export default function MonitoramentoPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MonitoramentoContent />
    </Suspense>
  );
}
