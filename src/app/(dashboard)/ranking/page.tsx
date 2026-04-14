'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Top5Cards } from '@/components/ranking/top5-cards';
import { RankingTable } from '@/components/ranking/ranking-table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';

function RankingPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate);
  const [to] = useQueryState("to", parseAsLocalIsoDate);
  const [city, setCity] = useQueryState('city');
  const [searchTerm, setSearchTerm] = useState('');

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

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

  const filteredRanking = searchTerm
    ? (data?.ranking || []).filter((t: { technicianName: string }) =>
        normalize(t.technicianName ?? '').includes(normalize(searchTerm)))
    : (data?.ranking || []);

  return (
    <PageLayout
      title="Ranking de Técnicos"
      description="Desempenho dos técnicos baseado no volume de OS e SLA atingido, com visão geral e segmentação por cidade."
      actions={
        <>
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[180px]"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cidade</label>
            <Select value={city || 'all'} onValueChange={(value) => setCity(value === 'all' ? null : value)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todas as cidades' : v.replace(/_/g, ' ')}</SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {(data?.cities || []).map((item: string) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <GlobalDateFilter />
        </>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <Top5Cards ranking={filteredRanking} />
          <RankingTable ranking={filteredRanking} />
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
