'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryState } from 'nuqs';
import { endOfMonth, startOfMonth } from 'date-fns';
import { CancellationsKpiCards } from '@/components/cancelamentos/cancellations-kpi-cards';
import { CancellationsCityChart } from '@/components/cancelamentos/cancellations-city-chart';
import { CancellationsReasonTable } from '@/components/cancelamentos/cancellations-reason-table';

function CancelamentosPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['cancellations-overview', qs],
    queryFn: async () => {
      const response = await fetch(`/api/cancellations?${qs}`);
      return response.json();
    },
  });

  return (
    <PageLayout
      title="Cancelamentos"
      description="Área dedicada aos cancelamentos, separada de Vendas, com leitura por cidade e motivo dentro da mesma arquitetura do sistema."
      actions={<GlobalDateFilter />}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
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
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>}>
      <CancelamentosPageContent />
    </Suspense>
  );
}
