'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/state-display';
import { SalesDistributionChart } from '@/components/vendas/sales-distribution-chart';
import { SalesKpiCards } from '@/components/vendas/sales-kpi-cards';
import { SalesReferralsSection } from '@/components/vendas/sales-referrals-section';
import { SalesSourceTable } from '@/components/vendas/sales-source-table';
import { SalesTopCities } from '@/components/vendas/sales-top-cities';
import { OmniVendasSection } from '@/components/vendas/omni-vendas-section';

function VendasPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (city) queryParams.set('city', city);
  if (plan) queryParams.set('plan', plan);
  if (source) queryParams.set('source', source);
  if (search) queryParams.set('search', search);
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['sales-overview', qs],
    queryFn: async () => {
      const response = await fetch(`/api/sales?${qs}`);
      if (!response.ok) throw new Error(`sales error: ${response.status}`);
      return response.json();
    },
    retry: false,
  });

  const { data: filterContract } = useQuery({
    queryKey: ['module-filters', 'sales'],
    queryFn: async () => {
      const response = await fetch('/api/module-filters/sales');
      if (!response.ok) throw new Error(`module-filters error: ${response.status}`);
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  return (
    <PageLayout
      title="Vendas"
      description="Indicadores comerciais integrados a mesma arquitetura do sistema, com funil consolidado por periodo."
      actions={
        <div className="flex flex-wrap gap-3">
          <GlobalDateFilter />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, plano ou observacao"
            className="w-full md:w-64"
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade"
            className="w-full md:w-40"
            list="sales-city-options"
          />
          <datalist id="sales-city-options">
            {(filterContract?.options?.city || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Plano"
            className="w-full md:w-40"
            list="sales-plan-options"
          />
          <datalist id="sales-plan-options">
            {(filterContract?.options?.plan || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Origem"
            className="w-full md:w-40"
            list="sales-source-options"
          />
          <datalist id="sales-source-options">
            {(filterContract?.options?.source || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <SalesKpiCards totals={data?.totals} />

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <SalesDistributionChart data={data?.byType || []} />
            <SalesTopCities data={data?.byCity || []} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <SalesSourceTable data={data?.bySource || []} />

            <Card>
              <CardHeader>
                <CardTitle>Leitura do modulo</CardTitle>
                <CardDescription>
                  O modulo consolida negociacao, fechamento, instalacoes e pedidos cancelados sem misturar cancelamentos de retencao.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Contratacoes fora do horario ou presencial ficam em KPI proprio. Cancelamentos do setor de retencao seguem separados no modulo de Cancelamentos.
              </CardContent>
            </Card>
          </div>

          <SalesReferralsSection
            filters={{
              from: from ? from.toISOString() : undefined,
              to: to ? to.toISOString() : undefined,
              city: city || undefined,
              search: search || undefined,
            }}
          />

          <OmniVendasSection />
        </>
      )}
    </PageLayout>
  );
}

export default function VendasPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VendasPageContent />
    </Suspense>
  );
}
