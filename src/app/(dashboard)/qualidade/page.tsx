'use client';

import { useQuery } from '@tanstack/react-query';
import { IndicatorCards } from '@/components/qualidade/indicator-cards';
import { QualityTable } from '@/components/qualidade/quality-table';
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
import { useState } from 'react';

export default function QualidadePage() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const [indicator, setIndicator] = useState<string>('all');

  const queryParams = new URLSearchParams({
    ...(indicator !== 'all' && { indicator }),
  });
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());

  const { data, isLoading } = useQuery({
    queryKey: ['quality-records', queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/quality-records?${queryParams.toString()}`);
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold">Qualidade & Reclamações</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de retrabalho, inviabilidades e retornos técnicos.
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <GlobalDateFilter />
          <Select value={indicator} onValueChange={(val) => setIndicator(val || 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Indicador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Indicadores</SelectItem>
              <SelectItem value="IQIv">IQIv (Rep. após Inst)</SelectItem>
              <SelectItem value="IQRv">IQRv (Rep. Reincidente)</SelectItem>
              <SelectItem value="RTV">RTV (Varejo/Anatel)</SelectItem>
              <SelectItem value="RST">RST (Serviço Téc.)</SelectItem>
              <SelectItem value="ICT">ICT (Inviabilidade)</SelectItem>
              <SelectItem value="Retorno">Retorno Geral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <IndicatorCards data={data?.data || []} />
      
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <QualityTable records={data?.data || []} />
      )}
    </div>
  );
}
