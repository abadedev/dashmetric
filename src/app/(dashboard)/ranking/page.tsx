'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Top5Cards } from '@/components/ranking/top5-cards';
import { RankingTable } from '@/components/ranking/ranking-table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';

function RankingPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const [city, setCity] = useQueryState('city');

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (city) queryParams.set('city', city);
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['ranking-full', qs],
    queryFn: async () => {
      const res = await fetch(`/api/ranking?${qs}`);
      if (!res.ok) throw new Error(`ranking error: ${res.status}`);
      return res.json();
    },
  });

  return (
    <PageLayout
      title="Ranking de Técnicos"
      description="Desempenho dos técnicos baseado no volume de OS e SLA atingido, com visão geral e segmentação por cidade."
      actions={
        <>
          <Select value={city || 'all'} onValueChange={(value) => setCity(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {(data?.cities || []).map((item: string) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GlobalDateFilter />
        </>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <Top5Cards ranking={data?.ranking || []} />
          <RankingTable ranking={data?.ranking || []} />
        </>
      )}
    </PageLayout>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingPageContent />
    </Suspense>
  );
}
