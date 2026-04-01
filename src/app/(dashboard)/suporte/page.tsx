'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SupportTable } from '@/components/suporte/support-table';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';

function SuportePageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['support-records', qs],
    queryFn: async () => {
      const res = await fetch(`/api/support-records?${qs}`);
      return res.json();
    },
  });

  return (
    <PageLayout
      title="Suporte Técnico"
      description="Resumo consolidado dos atendimentos de suporte por telefone classificados por tipo."
      actions={<GlobalDateFilter />}
    >
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <div className="max-w-4xl">
          <SupportTable
            summary={data?.data || []}
            total={data?.total || 0}
            from={from}
            to={to}
          />
        </div>
      )}
    </PageLayout>
  );
}

export default function SuportePage() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
      <SuportePageContent />
    </Suspense>
  );
}
