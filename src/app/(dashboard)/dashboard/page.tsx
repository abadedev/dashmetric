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

function DashboardPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
  const [city, setCity] = useQueryState('city');

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (city) queryParams.set('city', city);
  const qs = queryParams.toString();

  const { data: dashboardData, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard', qs],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?${qs}`);
      return res.json();
    },
  });

  const { data: rankingData, isLoading: isLoadingRank } = useQuery({
    queryKey: ['ranking', qs],
    queryFn: async () => {
      const res = await fetch(`/api/ranking?${qs}`);
      return res.json();
    },
  });

  const supportParams = new URLSearchParams();
  if (from) supportParams.set('from', from.toISOString());
  if (to) supportParams.set('to', to.toISOString());
  const supportQs = supportParams.toString();

  const { data: supportData } = useQuery({
    queryKey: ['support-records', supportQs],
    queryFn: async () => {
      const res = await fetch(`/api/support-records?${supportQs}`);
      if (!res.ok) throw new Error('support-records error');
      return res.json() as Promise<{ total: number }>;
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
        totalSuporte={supportData?.total ?? 0}
        clientesAtivos={clientesAtivosData?.total ?? 24803}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
