'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SupportTable } from '@/components/suporte/support-table';
import { SupportChart } from '@/components/suporte/support-chart';
import { PageSkeleton, TableSkeleton } from '@/components/ui/state-display';
import { StateDisplay } from '@/components/ui/state-display';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';

function formatLocalDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function SuportePageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate);
  const [to] = useQueryState("to", parseAsLocalIsoDate);

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', formatLocalDateParam(from));
  if (to) queryParams.set('to', formatLocalDateParam(to));
  const qs = queryParams.toString();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['support-records', qs],
    queryFn: async () => {
      const res = await fetch(`/api/support-records?${qs}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar o resumo de suporte.');
      }
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
        <TableSkeleton />
      ) : isError ? (
        <StateDisplay
          variant="error"
          title="Nao foi possivel carregar o resumo"
          description="Tivemos um problema ao consultar o consolidado de suporte por tipo."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <SupportTable
            summary={data?.data || []}
            total={data?.total || 0}
            from={from}
            to={to}
          />
          <SupportChart records={data?.triageByAttendant || []} />
        </div>
      )}
    </PageLayout>
  );
}

export default function SuportePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SuportePageContent />
    </Suspense>
  );
}
