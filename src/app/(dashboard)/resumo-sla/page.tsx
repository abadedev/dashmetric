'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { Badge } from '@/components/ui/badge';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PageLayout } from '@/components/layout/page-layout';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const SLA_META = 95;

function getSlaColor(value: number): string {
  if (value >= SLA_META) return '#22c55e';   // green
  if (value >= 80) return '#f59e0b';          // amber
  return '#ef4444';                            // red
}

function getSlaStatus(value: number) {
  if (value >= SLA_META) return { label: 'Meta atingida', color: 'text-green-500' };
  if (value >= 80) return { label: 'Próximo da meta', color: 'text-amber-500' };
  return { label: 'Abaixo da meta', color: 'text-red-500' };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}%</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
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
      return res.json();
    },
  });

  const rawData = data?.data || [];

  const uniquePeriods = Array.from<string>(
    new Set(rawData.map((r: any) => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`))
  ).sort();

  const monthlyData = uniquePeriods.map((periodKey: string) => {
    const [pYearStr, pMonthStr] = periodKey.split('-');
    const pYear = Number(pYearStr);
    const pMonth = Number(pMonthStr);
    const monthRecords = rawData.filter((r: any) =>
      r.periodYear === pYear && r.periodMonth === pMonth
    );

    const monthObj: any = { name: `${MONTH_NAMES[pMonth - 1]}/${pYearStr.slice(-2)}`, totalOS: 0 };

    const totalConc = monthRecords.reduce((s: number, r: any) => s + Number(r.concluded), 0);
    const totalUtil = monthRecords.reduce((s: number, r: any) => s + Number(r.withinSlaUtil), 0);
    const totalAtividades = monthRecords.reduce((s: number, r: any) => s + Number(r.total), 0);

    monthObj.Geral = totalConc > 0 ? Math.round((totalUtil / totalConc) * 100) : 0;
    monthObj.totalOS = totalAtividades;

    monthRecords.forEach((r: any) => {
      const type = ACTIVITY_LABELS[r.activityType] || r.activityType;
      const pct = Number(r.concluded) > 0 ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100) : 0;
      monthObj[type] = pct;
    });

    return monthObj;
  }).filter((m: any) => m.totalOS > 0);

  // KPI derivations
  const avgGeral = monthlyData.length
    ? Math.round(monthlyData.reduce((s, m) => s + m.Geral, 0) / monthlyData.length)
    : 0;
  const bestMonth = monthlyData.reduce((best, m) => (m.Geral > (best?.Geral ?? -1) ? m : best), null as any);
  const worstMonth = monthlyData.reduce((worst, m) => (m.Geral < (worst?.Geral ?? 101) ? m : worst), null as any);
  const monthsAboveMeta = monthlyData.filter(m => m.Geral >= SLA_META).length;

  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const refLineColor = '#22c55e';

  return (
    <PageLayout
      title="Resumo SLA por Período"
      description="Evolução mensal do percentual de SLA atingido por tipo de atividade."
      actions={<GlobalDateFilter />}
    >
      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : monthlyData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SLA Médio */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="h-3.5 w-3.5" />
                SLA Médio Geral
              </div>
              <div className={`text-3xl font-bold ${getSlaStatus(avgGeral).color}`}>{avgGeral}%</div>
              <div className="text-xs text-muted-foreground mt-1">{getSlaStatus(avgGeral).label}</div>
            </CardContent>
          </Card>

          {/* Melhor mês */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Award className="h-3.5 w-3.5" />
                Melhor Mês
              </div>
              <div className="text-3xl font-bold text-green-500">{bestMonth?.Geral ?? 0}%</div>
              <div className="text-xs text-muted-foreground mt-1">{bestMonth?.name ?? '—'}</div>
            </CardContent>
          </Card>

          {/* Pior mês */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pior Mês
              </div>
              <div className={`text-3xl font-bold ${getSlaStatus(worstMonth?.Geral ?? 0).color}`}>
                {worstMonth?.Geral ?? 0}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">{worstMonth?.name ?? '—'}</div>
            </CardContent>
          </Card>

          {/* Meses acima da meta */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Meses com Meta
              </div>
              <div className="text-3xl font-bold text-foreground">
                {monthsAboveMeta}
                <span className="text-base font-normal text-muted-foreground">/{monthlyData.length}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Acima de {SLA_META}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {isLoading ? (
        <PageSkeleton />
      ) : monthlyData.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center text-muted-foreground">
            Sem dados para o período selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <Card className="xl:col-span-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Desempenho por Mês (SLA Útil %)</CardTitle>
              <Badge variant="outline" className="text-xs border-dashed text-green-500 border-green-500/40">
                Meta Ouro: {SLA_META}%
              </Badge>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
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
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSlaColor(entry.Geral)} fillOpacity={0.9} />
                    ))}
                  </Bar>
                  <Bar dataKey="Instalação Nova" name="Instalação" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                  <Bar dataKey="Reparo" name="Reparo" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                  <Bar dataKey="Mudança de Endereço" name="Mudança" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} maxBarSize={24} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Line Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tendência — SLA Geral</CardTitle>
              <p className="text-xs text-muted-foreground">Evolução mensal do índice geral</p>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
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
                    stroke="#3b82f6"
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
