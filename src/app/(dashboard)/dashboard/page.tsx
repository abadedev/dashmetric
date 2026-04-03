'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashielContextBridge } from '@/components/ai/dashiel-context-bridge';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { QualitySummary } from '@/components/dashboard/quality-summary';
import { SlaByTypeTable } from '@/components/dashboard/sla-by-type-table';
import { Top5Ranking } from '@/components/dashboard/top5-ranking';
import { VolumePieChart } from '@/components/dashboard/volume-pie-chart';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { PageSkeleton } from '@/components/ui/state-display';
import { useQueryState } from 'nuqs';

function DashboardPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState('to', parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const rangeStart = from ?? startOfMonth(new Date());
  const rangeEnd = to ?? endOfMonth(new Date());

  const queryParams = new URLSearchParams();
  if (rangeStart) queryParams.set('from', rangeStart.toISOString());
  if (rangeEnd) queryParams.set('to', rangeEnd.toISOString());
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

  if (isLoadingDash || isLoadingRank) {
    return <PageSkeleton />;
  }

  const sortedByVolume = [...(dashboardData?.slaByType || [])].sort(
    (a, b) => Number(b.total) - Number(a.total)
  );
  const topCategory = sortedByVolume[0]?.activityType || 'Reparo';
  const validAverageSla = sortedByVolume
    .map((item) => Number(item.avgUtilSeconds || 0))
    .filter((value) => value > 0);
  const averageSlaSeconds =
    validAverageSla.length > 0
      ? validAverageSla.reduce((acc, value) => acc + value, 0) / validAverageSla.length
      : 0;
  const dashielContext = {
    periodLabel: `${format(rangeStart, 'dd MMM, yyyy', { locale: ptBR })} - ${format(rangeEnd, 'dd MMM, yyyy', {
      locale: ptBR,
    })}`,
    visibleChart: 'volume_por_tipo',
    chartTitle: 'Volume por Tipo',
    summary: {
      totalAttendances: Number(dashboardData?.totalAtendimentos || 0),
      averageSlaHours: averageSlaSeconds > 0 ? averageSlaSeconds / 3600 : undefined,
      topCategory,
    },
  };

  return (
    <PageLayout
      title="Dashboard Executivo"
      description="Visão geral de SLA, ranking de técnicos e indicadores de qualidade."
      actions={<GlobalDateFilter />}
    >
      <DashielContextBridge context={dashielContext} />
      <KpiCards data={dashboardData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SlaByTypeTable data={dashboardData?.slaByType || []} />
        </div>
        <div className="lg:col-span-1">
          <VolumePieChart data={dashboardData?.slaByType || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
