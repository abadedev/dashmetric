'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { QualitySummary } from '@/components/dashboard/quality-summary';
import { OcorrenciasPorTipo } from '@/components/dashboard/ocorrencias-por-tipo';
import { Top5Ranking } from '@/components/dashboard/top5-ranking';
import { VolumePieChart } from '@/components/dashboard/volume-pie-chart';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageSkeleton } from '@/components/ui/state-display';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';

function DashboardPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
  const [city, setCity] = useQueryState('city');

  const effectiveFrom = from ?? startOfMonth(new Date());
  const effectiveUntil = to ?? endOfMonth(new Date());
  const fromIso = effectiveFrom.toISOString();
  const untilIso = effectiveUntil.toISOString();
  const supportFromParam = formatDateParam(effectiveFrom);
  const supportToParam = formatDateParam(effectiveUntil);

  const queryParams = new URLSearchParams();
  queryParams.set('from', fromIso);
  queryParams.set('to', untilIso);
  if (city) queryParams.set('city', city);
  const qs = queryParams.toString();

  const { data: dashboardData, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard', fromIso, untilIso, city ?? ''],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?${qs}`);
      return res.json();
    },
  });

  const { data: rankingData, isLoading: isLoadingRank } = useQuery({
    queryKey: ['ranking', fromIso, untilIso, city ?? ''],
    queryFn: async () => {
      const res = await fetch(`/api/ranking?${qs}`);
      return res.json();
    },
  });

  const supportParams = new URLSearchParams();
  supportParams.set('from', supportFromParam);
  supportParams.set('to', supportToParam);
  const supportQs = supportParams.toString();

  const { data: supportData } = useQuery({
    queryKey: ['suporte-call-records', supportFromParam, supportToParam],
    queryFn: async () => {
      const res = await fetch(`/api/suporte/call-records?${supportQs}`);
      if (!res.ok) throw new Error('suporte-call-records error');
      return res.json() as Promise<{ totalSupporte: number }>;
    },
    retry: false,
  });

  const { data: clientesAtivosData } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: async () => {
      const res = await fetch('/api/intranet/clientes-ativos');
      if (!res.ok) throw new Error('clientes-ativos error');
      return res.json() as Promise<{ total: number; source: string }>;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const clientesAtivos = clientesAtivosData?.total ?? 24803;
  const totalReparos = dashboardData?.totalReparos ?? 0;
  const totalSuporte = supportData?.totalSupporte ?? 0;
  const inrReparos = totalReparos > 0 && clientesAtivos > 0
    ? (totalReparos / clientesAtivos) * 100
    : null;
  const inrSuportePercent = totalSuporte ? (totalSuporte / clientesAtivos) * 100 : null;

  if (isLoadingDash || isLoadingRank) {
    return <PageSkeleton />;
  }

  return (
    <PageLayout
      title="Dashboard Executivo"
      description="Visão geral de SLA, ranking de técnicos e indicadores de qualidade."
      actions={
        <>
          <Select value={city || 'all'} onValueChange={(value) => setCity(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar cidade" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {(dashboardData?.cities || []).map((item: string) => (
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
      <KpiCards
        data={dashboardData}
        inrReparos={inrReparos}
        inrSuportePercent={inrSuportePercent}
        totalReparos={totalReparos}
        totalSuporte={totalSuporte}
        clientesAtivos={clientesAtivos}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0">
          <OcorrenciasPorTipo data={dashboardData?.slaByType || []} />
        </div>
        <div className="min-w-0">
          <VolumePieChart data={dashboardData?.slaByType || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Top5Ranking ranking={rankingData?.ranking || []} />
        <QualitySummary data={dashboardData?.qualityIndicators || []} />
      </div>
    </PageLayout>
  );
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
