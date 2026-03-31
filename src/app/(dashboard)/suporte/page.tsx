'use client';

import { useQuery } from '@tanstack/react-query';
import { SupportTable } from '@/components/suporte/support-table';
import { SupportChart } from '@/components/suporte/support-chart';
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

export default function SuportePage() {
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
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold">Suporte Técnico</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Eficiência de triagem e envio de OSs de manutenção.
          </p>
        </div>
        <div className="flex gap-4">
          <GlobalDateFilter />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <SupportTable records={data?.data || []} />
          <SupportChart records={data?.data || []} />
        </div>
      )}
    </div>
  );
}
