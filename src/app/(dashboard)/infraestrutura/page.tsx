'use client';

import { Suspense, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Network, RefreshCw, TrendingUp } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { endOfMonth, startOfMonth } from 'date-fns';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import {
  CityBarChart,
  DailyBarChart,
  NetworkBoxTable,
  OccurrenceDistributionChart,
  RecurringIssuesTable,
  TechnicianRankingTable,
} from '@/components/infraestrutura/infra-charts';
import { INFRA_OCCURRENCE_OPTIONS } from '@/lib/listagem-servicos/infra-occurrences';

interface DashboardData {
  kpi: {
    total: number;
    pending: number;
    resolved: number;
    recurring: number;
    resolutionRate: number;
    avgResolutionDays: number;
    topOccurrence: string;
  };
  byDay: Array<{ date: string; opened: number; resolved: number }>;
  byOccurrence: Array<{ name: string; value: number }>;
  byCity: Array<{ city: string; total: number }>;
  byNetworkBox: Array<{ networkBox: string; total: number }>;
  byTechnician: Array<{ technician: string; total: number }>;
  recurringIssues: Array<{ occurrenceType: string; city: string; networkBox: string; total: number }>;
  filters: {
    cities: string[];
    technicians: string[];
    statuses: string[];
    occurrenceTypes: string[];
  };
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ElementType;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-md p-1.5 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="line-clamp-2 text-2xl font-bold">{value}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function InfraestruturaContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState('to', parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const [city, setCity] = useQueryState('city');
  const [technician, setTechnician] = useQueryState('technician');
  const [status, setStatus] = useQueryState('status');
  const [tipoOcorrencia, setTipoOcorrencia] = useQueryState('tipoOcorrencia');

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString().slice(0, 10));
  if (to) queryParams.set('to', to.toISOString().slice(0, 10));
  if (city && city !== 'all') queryParams.set('city', city);
  if (technician && technician !== 'all') queryParams.set('technician', technician);
  if (status && status !== 'all') queryParams.set('status', status);
  if (tipoOcorrencia && tipoOcorrencia !== 'all') queryParams.set('tipoOcorrencia', tipoOcorrencia);
  const qs = queryParams.toString();

  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['infrastructure-dashboard', qs],
    queryFn: async () => {
      const res = await fetch(`/api/infrastructure-dashboard?${qs}`);
      return res.json();
    },
  });

  return (
    <PageLayout
      title="Infraestrutura"
      description="Dashboard visual dos dados de infraestrutura de rede."
      actions={
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ocorrência</label>
            <Select value={tipoOcorrencia || 'all'} onValueChange={(value) => setTipoOcorrencia(value === 'all' ? null : value)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todas as ocorrências' : v}</SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                <SelectItem value="all">Todas as ocorrências</SelectItem>
                {(data?.filters.occurrenceTypes ?? INFRA_OCCURRENCE_OPTIONS).map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cidade</label>
            <Select value={city || 'all'} onValueChange={(value) => setCity(value === 'all' ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todas as cidades' : v.replace(/_/g, ' ')}</SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {(data?.filters.cities ?? []).map((item) => (
                  <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Técnico</label>
            <Select value={technician || 'all'} onValueChange={(value) => setTechnician(value === 'all' ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todos os técnicos' : v}</SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {(data?.filters.technicians ?? []).map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
            <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todos os status' : v}</SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                <SelectItem value="all">Todos os status</SelectItem>
                {(data?.filters.statuses ?? []).map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <GlobalDateFilter />

          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Total de OS"
              value={data?.kpi.total ?? 0}
              subtitle="ocorrencias no periodo"
              icon={Network}
              accent="bg-indigo-500/10 text-indigo-400"
            />
            <KpiCard
              title="Pendentes"
              value={data?.kpi.pending ?? 0}
              subtitle="aguardando tratamento"
              icon={AlertCircle}
              accent="bg-orange-500/10 text-orange-400"
            />
            <KpiCard
              title="Resolvidas"
              value={data?.kpi.resolved ?? 0}
              subtitle="OS finalizadas"
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-400"
            />
            <KpiCard
              title="Problema Lider"
              value={data?.kpi.topOccurrence ?? '-'}
              subtitle="tipo mais frequente"
              icon={TrendingUp}
              accent="bg-sky-500/10 text-sky-400"
            />
            <KpiCard
              title="Recorrentes"
              value={data?.kpi.recurring ?? 0}
              subtitle="marcadas para ocorrencia"
              icon={Clock}
              accent="bg-amber-500/10 text-amber-400"
            />
            <KpiCard
              title="Tempo Medio"
              value={`${data?.kpi.avgResolutionDays ?? 0}d`}
              subtitle={`taxa de resolucao ${data?.kpi.resolutionRate ?? 0}%`}
              icon={CheckCircle2}
              accent="bg-purple-500/10 text-purple-400"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {isLoading ? (
          <>
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </>
        ) : (
          <>
            <DailyBarChart data={data?.byDay ?? []} />
            <OccurrenceDistributionChart data={data?.byOccurrence ?? []} />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </>
        ) : (
          <>
            <CityBarChart data={data?.byCity ?? []} />
            <NetworkBoxTable data={data?.byNetworkBox ?? []} />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {isLoading ? (
          <>
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </>
        ) : (
          <>
            <RecurringIssuesTable data={data?.recurringIssues ?? []} />
            <TechnicianRankingTable data={data?.byTechnician ?? []} />
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default function InfraestruturaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InfraestruturaContent />
    </Suspense>
  );
}
