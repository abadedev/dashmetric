'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { SlaByTypeTable } from '@/components/dashboard/sla-by-type-table';
import { VolumePieChart } from '@/components/dashboard/volume-pie-chart';
import { Top5Ranking } from '@/components/dashboard/top5-ranking';
import { QualitySummary } from '@/components/dashboard/quality-summary';
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
import { PageLayout } from '@/components/layout/page-layout';

function DashboardPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
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
    return <div className="space-y-4 pt-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <PageLayout
      title="Dashboard Executivo"
      description="Visão geral de SLA, ranking de técnicos e indicadores de qualidade."
      actions={<GlobalDateFilter />}
    >
      <KpiCards data={dashboardData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SlaByTypeTable data={dashboardData?.slaByType || []} />
        </div>
        <div className="lg:col-span-1">
          <VolumePieChart data={dashboardData?.slaByType || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Top5Ranking ranking={rankingData?.ranking || []} />
        <QualitySummary data={dashboardData?.qualityIndicators || []} />
      </div>
    </PageLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="space-y-4 pt-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
