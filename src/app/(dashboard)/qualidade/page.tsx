'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndicatorCards } from '@/components/qualidade/indicator-cards';
import { QualityTable } from '@/components/qualidade/quality-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';

function QualidadePageContent() {
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
    <PageLayout
      title="Qualidade & Reclamações"
      description="Métricas de retrabalho, inviabilidades e retornos técnicos."
      actions={
        <div className="flex gap-3 flex-wrap">
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
      }
    >
      <IndicatorCards data={data?.data || []} />
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <QualityTable records={data?.data || []} />
      )}
    </PageLayout>
  );
}

export default function QualidadePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <QualidadePageContent />
    </Suspense>
  );
}
