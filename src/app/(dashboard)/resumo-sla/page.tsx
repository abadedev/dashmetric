'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from 'next-themes';
import { useQueryState } from 'nuqs';
import {
  Award,
  AlertTriangle,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SLA_META = 95;

function getSlaColor(value: number): string {
  if (value >= SLA_META) return '#22c55e';
  if (value >= 80) return '#0ea5e9';
  return '#ef4444';
}

function getSlaStatus(value: number) {
  if (value >= SLA_META) return { label: 'Meta atingida', color: 'text-green-500' };
  if (value >= 80) return { label: 'Proximo da meta', color: 'text-sky-600 dark:text-sky-400' };
  return { label: 'Abaixo da meta', color: 'text-red-500' };
}

const surfaceClassName =
  'border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/75 bg-card/95 p-3 text-sm shadow-xl backdrop-blur-sm">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}%</span>
        </div>
      ))}
      <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
        Meta Ouro: {SLA_META}%
      </div>
    </div>
  );
};

function ResumoSlaPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState('to', parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['sla-summary', qs],
    queryFn: async () => {
      const res = await fetch(`/api/sla-summary?${qs}`);
      if (!res.ok) throw new Error(`sla-summary error: ${res.status}`);
      return res.json();
    },
  });

  const rawData = data?.data || [];

  const uniquePeriods = Array.from<string>(
    new Set(rawData.map((r: any) => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`))
  ).sort();

  const monthlyData = uniquePeriods
    .map((periodKey: string) => {
      const [pYearStr, pMonthStr] = periodKey.split('-');
      const pYear = Number(pYearStr);
      const pMonth = Number(pMonthStr);
      const monthRecords = rawData.filter((r: any) => r.periodYear === pYear && r.periodMonth === pMonth);

      const monthObj: any = { name: `${MONTH_NAMES[pMonth - 1]}/${pYearStr.slice(-2)}`, totalOS: 0 };

      const totalConc = monthRecords.reduce((s: number, r: any) => s + Number(r.concluded), 0);
      const totalUtil = monthRecords.reduce((s: number, r: any) => s + Number(r.withinSlaUtil), 0);
      const totalAtividades = monthRecords.reduce((s: number, r: any) => s + Number(r.total), 0);

      monthObj.Geral = totalConc > 0 ? Math.round((totalUtil / totalConc) * 100) : 0;
      monthObj.totalOS = totalAtividades;

      monthRecords.forEach((r: any) => {
        const type = ACTIVITY_LABELS[r.activityType] || r.activityType;
        const pct =
          Number(r.concluded) > 0
            ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100)
            : 0;
        monthObj[type] = pct;
      });

      return monthObj;
    })
    .filter((m: any) => m.totalOS > 0);

  const avgGeral = monthlyData.length
    ? Math.round(monthlyData.reduce((s: number, m: any) => s + m.Geral, 0) / monthlyData.length)
    : 0;
  const bestMonth = monthlyData.reduce(
    (best: any, m: any) => (m.Geral > (best?.Geral ?? -1) ? m : best),
    null
  );
  const worstMonth = monthlyData.reduce(
    (worst: any, m: any) => (m.Geral < (worst?.Geral ?? 101) ? m : worst),
    null
  );
  const monthsAboveMeta = monthlyData.filter((m: any) => m.Geral >= SLA_META).length;

  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const refLineColor = '#22c55e';

  return (
    <PageLayout
      title="Resumo SLA por Periodo"
      description="Evolucao mensal do percentual de SLA atingido por tipo de atividade."
      actions={<GlobalDateFilter />}
    >
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : monthlyData.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className={surfaceClassName}>
            <CardContent className="pb-4 pt-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                SLA Medio Geral
              </div>
              <div className={`text-3xl font-bold ${getSlaStatus(avgGeral).color}`}>{avgGeral}%</div>
              <div className="mt-1 text-xs text-muted-foreground">{getSlaStatus(avgGeral).label}</div>
            </CardContent>
          </Card>

          <Card className={surfaceClassName}>
            <CardContent className="pb-4 pt-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                Melhor Mes
              </div>
              <div className="text-3xl font-bold text-green-500">{bestMonth?.Geral ?? 0}%</div>
              <div className="mt-1 text-xs text-muted-foreground">{bestMonth?.name ?? '-'}</div>
            </CardContent>
          </Card>

          <Card className={surfaceClassName}>
            <CardContent className="pb-4 pt-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pior Mes
              </div>
              <div className={`text-3xl font-bold ${getSlaStatus(worstMonth?.Geral ?? 0).color}`}>
                {worstMonth?.Geral ?? 0}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{worstMonth?.name ?? '-'}</div>
            </CardContent>
          </Card>

          <Card className={surfaceClassName}>
            <CardContent className="pb-4 pt-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Meses com Meta
              </div>
              <div className="text-3xl font-bold text-foreground">
                {monthsAboveMeta}
                <span className="text-base font-normal text-muted-foreground">/{monthlyData.length}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Acima de {SLA_META}%</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : monthlyData.length === 0 ? (
        <Card className={surfaceClassName}>
          <CardContent className="p-16 text-center text-muted-foreground">
            Sem dados para o periodo selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className={`xl:col-span-2 ${surfaceClassName}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Desempenho por Mes (SLA Util %)</CardTitle>
              <Badge variant="outline" className="border-border/80 bg-background/80 text-xs text-muted-foreground">
                Meta Ouro: {SLA_META}%
              </Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={312}>
                <ComposedChart data={monthlyData} margin={{ top: 16, right: 16, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                    formatter={(value) => <span style={{ color: axisColor }}>{value}</span>}
                  />
                  <ReferenceLine
                    y={SLA_META}
                    stroke={refLineColor}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: 'Meta 95%', position: 'insideTopRight', fill: refLineColor, fontSize: 10 }}
                  />
                  <Bar dataKey="Geral" name="Geral" radius={[6, 6, 0, 0]} barSize={36} maxBarSize={48}>
                    {monthlyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getSlaColor(entry.Geral)} fillOpacity={0.9} />
                    ))}
                  </Bar>
                  <Bar dataKey="Instalação Nova" name="Instalacao" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                  <Bar dataKey="Reparo" name="Reparo" fill="#64748b" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                  <Bar dataKey="Mudança de Endereço" name="Mudanca" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={surfaceClassName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tendencia - SLA Geral</CardTitle>
              <p className="text-xs text-muted-foreground">Evolucao mensal do indice geral</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={312}>
                <ComposedChart data={monthlyData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                  <ReferenceLine y={SLA_META} stroke={refLineColor} strokeDasharray="4 3" strokeWidth={1.5} />
                  <Line
                    type="monotone"
                    dataKey="Geral"
                    name="SLA Geral"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${payload.name}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={getSlaColor(payload.Geral)}
                          stroke={isDark ? '#1e293b' : '#fff'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}

export default function ResumoSlaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResumoSlaPageContent />
    </Suspense>
  );
}
