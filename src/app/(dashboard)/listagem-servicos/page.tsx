'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { endOfMonth, startOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/state-display';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceListingsTable } from '@/components/listagem-servicos/service-listings-table';
import { ServiceForm } from '@/components/listagem-servicos/service-form';
import { useSession } from '@/lib/auth-client';
import type { AppRole } from '@/lib/services/module-service';
import type { ServiceListing } from '@/lib/db/infra-schema';
import { INFRA_OCCURRENCE_OPTIONS } from '@/lib/listagem-servicos/infra-occurrences';

function ListagemServicosContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState('to', parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const [city, setCity] = useQueryState('city');
  const [technician, setTechnician] = useQueryState('technician');
  const [technology, setTechnology] = useQueryState('technology');
  const [tipoOcorrencia, setTipoOcorrencia] = useQueryState('tipoOcorrencia');
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });

  const [newFormOpen, setNewFormOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString().slice(0, 10));
  if (to) queryParams.set('to', to.toISOString().slice(0, 10));
  if (city && city !== 'all') queryParams.set('city', city);
  if (technician && technician !== 'all') queryParams.set('technician', technician);
  if (technology && technology !== 'all') queryParams.set('technology', technology);
  if (tipoOcorrencia && tipoOcorrencia !== 'all') queryParams.set('tipoOcorrencia', tipoOcorrencia);
  queryParams.set('page', page ?? '1');
  queryParams.set('pageSize', '50');
  const qs = queryParams.toString();

  const queryKey = ['listagem-servicos', qs] as const;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/listagem-servicos?${qs}`);
      return res.json() as Promise<{
        data: ServiceListing[];
        total: number;
        page: number;
        pageSize: number;
        cities: string[];
        technicians: string[];
        occurrenceTypes: string[];
        userRole?: AppRole;
      }>;
    },
  });

  const { data: session } = useSession();
  const userRole: AppRole = ((session?.user as { role?: AppRole })?.role ?? 'user') as AppRole;
  const canEdit = userRole === 'editor' || userRole === 'admin';
  const totalPages = data ? Math.ceil(data.total / 50) : 1;
  const currentPage = parseInt(page ?? '1', 10);

  return (
    <PageLayout
      title={'Listagem de servi\u00E7os'}
      description={'Controle operacional di\u00E1rio de chamados de infraestrutura de rede.'}
      actions={
        <>
          <Select
            value={tipoOcorrencia || 'all'}
            onValueChange={(value) => {
              setTipoOcorrencia(value === 'all' ? null : value);
              setPage('1');
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Ocorrencia" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as ocorrencias</SelectItem>
              {(data?.occurrenceTypes ?? INFRA_OCCURRENCE_OPTIONS).map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={technology || 'all'}
            onValueChange={(value) => {
              setTechnology(value === 'all' ? null : value);
              setPage('1');
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tecnologia" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Tecnologia</SelectItem>
              <SelectItem value="F">{'F \u2014 Fibra'}</SelectItem>
              <SelectItem value="C">{'C \u2014 Cabo'}</SelectItem>
              <SelectItem value="R">{'R \u2014 R\u00E1dio'}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={technician || 'all'}
            onValueChange={(value) => {
              setTechnician(value === 'all' ? null : value);
              setPage('1');
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={'T\u00E9cnico'} />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">{'Todos os t\u00E9cnicos'}</SelectItem>
              {(data?.technicians ?? []).map((item) => (
                <SelectItem key={item} value={item} className="capitalize">{item?.toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={city || 'all'}
            onValueChange={(value) => {
              setCity(value === 'all' ? null : value);
              setPage('1');
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {(data?.cities ?? []).map((item) => (
                <SelectItem key={item} value={item ?? ''}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <GlobalDateFilter />

          <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {canEdit && (
            <Button onClick={() => setNewFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo registro
            </Button>
          )}
        </>
      }
    >
      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{data.total}</strong> registros encontrados
          </span>
          {totalPages > 1 && (
            <span>
              {'P\u00E1gina'} <strong className="text-foreground">{currentPage}</strong> de{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
          )}
        </div>
      )}

      <ServiceListingsTable
        data={data?.data}
        isLoading={isLoading}
        userRole={userRole}
        queryKey={queryKey}
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
              {'Pr\u00F3xima'}
            </Button>
          </CardContent>
        </Card>
      )}

      <ServiceForm
        open={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        queryKey={queryKey}
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
