'use client';

import { Suspense, useState } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { CancellationsCityChart } from '@/components/cancelamentos/cancellations-city-chart';
import { CancellationsKpiCards } from '@/components/cancelamentos/cancellations-kpi-cards';
import { CancellationsReasonTable } from '@/components/cancelamentos/cancellations-reason-table';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/state-display';

function CancelamentosPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState('to', parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
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
    queryKey: ['cancellations-overview', qs],
    queryFn: async () => {
      const response = await fetch(`/api/cancellations?${qs}`);
      return response.json();
    },
  });

  const { data: filterContract } = useQuery({
    queryKey: ['module-filters', 'cancellations'],
    queryFn: async () => {
      const response = await fetch('/api/module-filters/cancellations');
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <PageLayout
      title="Cancelamentos"
      description="Area dedicada aos cancelamentos, separada de Vendas, com leitura por cidade e motivo dentro da mesma arquitetura do sistema."
      actions={
        <div className="flex flex-wrap gap-3">
          <GlobalDateFilter />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, motivo ou observacao"
            className="w-full md:w-64"
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade"
            className="w-full md:w-40"
            list="cancellations-city-options"
          />
          <datalist id="cancellations-city-options">
            {(filterContract?.options?.city || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Plano"
            className="w-full md:w-40"
            list="cancellations-plan-options"
          />
          <datalist id="cancellations-plan-options">
            {(filterContract?.options?.plan || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Origem"
            className="w-full md:w-40"
            list="cancellations-source-options"
          />
          <datalist id="cancellations-source-options">
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
          <CancellationsKpiCards totals={data?.totals} />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <CancellationsCityChart data={data?.byCity || []} />
            <CancellationsReasonTable data={data?.byReason || []} />
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default function CancelamentosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CancelamentosPageContent />
    </Suspense>
  );
}
