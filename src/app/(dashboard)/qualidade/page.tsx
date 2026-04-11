'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndicatorCards } from '@/components/qualidade/indicator-cards';
import { QualityTable } from '@/components/qualidade/quality-table';
import { PageSkeleton, TableSkeleton } from '@/components/ui/state-display';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';
import { Input } from '@/components/ui/input';

function QualidadePageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const [indicator, setIndicator] = useState<string>('all');
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('');
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams({
    ...(indicator !== 'all' && { indicator }),
    ...(city && { city }),
    ...(plan && { plan }),
    ...(search && { search }),
  });
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());

  const { data, isLoading } = useQuery({
    queryKey: ['quality-records', queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/quality-records?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`quality-records error: ${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const { data: filterContract } = useQuery({
    queryKey: ['module-filters', 'quality'],
    queryFn: async () => {
      const res = await fetch('/api/module-filters/quality');
      if (!res.ok) throw new Error(`module-filters error: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  return (
    <PageLayout
      title="Qualidade & Reclamações"
      description="Métricas de retrabalho, inviabilidades e retornos técnicos."
      actions={
        <div className="flex gap-3 flex-wrap">
          <GlobalDateFilter />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por OS, cliente ou motivo"
            className="w-full md:w-64"
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade"
            className="w-full md:w-40"
            list="quality-city-options"
          />
          <datalist id="quality-city-options">
            {(filterContract?.options?.city || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Plano"
            className="w-full md:w-40"
            list="quality-plan-options"
          />
          <datalist id="quality-plan-options">
            {(filterContract?.options?.plan || []).map((item: string) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Indicador</label>
            <Select value={indicator} onValueChange={(val) => setIndicator(val || 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todos os indicadores' : v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os indicadores</SelectItem>
                <SelectItem value="IQIv">IQIv (Rep. após Inst)</SelectItem>
                <SelectItem value="IQRv">IQRv (Rep. Reincidente)</SelectItem>
                <SelectItem value="RTV">RTV (Varejo/Anatel)</SelectItem>
                <SelectItem value="RST">{'RST (Servi\u00E7o T\u00E9c.)'}</SelectItem>
                <SelectItem value="ICT">ICT (Inviabilidade)</SelectItem>
                <SelectItem value="Retorno">Retorno Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <IndicatorCards byIndicator={data?.byIndicator ?? {}} totalReparos={data?.totalReparos ?? 0} />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <QualityTable records={data?.data || []} />
      )}
    </PageLayout>
  );
}

export default function QualidadePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QualidadePageContent />
    </Suspense>
  );
}
