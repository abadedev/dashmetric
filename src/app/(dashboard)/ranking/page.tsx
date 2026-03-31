'use client';

import { useQuery } from '@tanstack/react-query';
import { Top5Cards } from '@/components/ranking/top5-cards';
import { RankingTable } from '@/components/ranking/ranking-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function RankingPage() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['ranking-full', qs],
    queryFn: async () => {
      const res = await fetch(`/api/ranking?${qs}`);
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold">Ranking de Produtividade</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Desempenho dos técnicos baseado no volume de OS e SLA atingido.
          </p>
        </div>
        <div className="flex gap-4">
          <GlobalDateFilter />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          <Top5Cards ranking={data?.ranking || []} />
          <RankingTable ranking={data?.ranking || []} />
        </>
      )}
    </div>
  );
}
