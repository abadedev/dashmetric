'use client';

import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  AlertTriangle,
  ClipboardList,
  Headphones,
  Layers,
  Minus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { useTheme } from '@/components/providers';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { cn } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SLA_META = 95;

const ACTIVITY_COLORS: Record<string, string> = {
  'Instalação Nova': '#3b82f6',
  'Instalação Reativação': '#06b6d4',
  Reparo: '#8b5cf6',
  'Mudança de Endereço': '#f59e0b',
  'Mudança de Plano': '#ec4899',
  Retorno: '#64748b',
  Geral: '#ffffff',
};
const LOWER_BETTER_TYPES = ['cancelado', 'em aberto', 'retorno', 'retirada'];
const PRODUCTIVE_TYPE_ORDER = ['instala', 'reparo', 'mudan'];
const LAST_TYPE_ORDER = ['cancelado', 'retorno', 'retirada'];

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

function activityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? '#94a3b8';
}

function heatCellBg(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'bg-muted/30 text-muted-foreground border-border/40';
  if (value >= SLA_META) return 'bg-emerald-500/80 text-white border-emerald-400/40';
  if (value >= 80) return 'bg-amber-500/80 text-white border-amber-400/40';
  return 'bg-red-500/80 text-white border-red-400/40';
}

const surfaceClassName =
  'border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]';

const PercentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const sorted = [...payload].sort((a: any, b: any) => Number(b.value ?? 0) - Number(a.value ?? 0));

  return (
    <div className="rounded-xl border border-border/75 bg-card/95 p-3 text-sm shadow-xl backdrop-blur-sm">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        {sorted.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium text-foreground">{entry.value}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
        Meta Ouro: {SLA_META}%
      </div>
    </div>
  );
};

type DeltaDirection = 'higher-better' | 'lower-better' | 'neutral';

function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    return { value: null as number | null, direction: 'flat' as const };
  }
  const value = ((current - previous) / previous) * 100;
  if (value > 0) return { value, direction: 'up' as const };
  if (value < 0) return { value, direction: 'down' as const };
  return { value: 0, direction: 'flat' as const };
}

function formatDelta(value: number | null) {
  if (value === null) return '—';
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

function deltaTone(direction: 'up' | 'down' | 'flat', orientation: DeltaDirection) {
  if (direction === 'flat') return 'text-muted-foreground bg-muted/40 border-border/60';
  if (orientation === 'neutral') return 'text-muted-foreground bg-muted/40 border-border/60';
  const isPositive =
    (direction === 'up' && orientation === 'higher-better') ||
    (direction === 'down' && orientation === 'lower-better');
  return isPositive
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30';
}

function DeltaBadge({
  current,
  previous,
  orientation,
}: {
  current: number;
  previous: number;
  orientation: DeltaDirection;
}) {
  const { value, direction } = computeDelta(current, previous);
  const tone = deltaTone(direction, orientation);
  const Icon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tracking-tight',
        tone
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {formatDelta(value)}
    </span>
  );
}

type CompKpiProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  previous: number;
  format?: (n: number) => string;
  valueColor?: string;
  orientation: DeltaDirection;
  hint?: string;
};

function ComparativeKpi({
  label,
  icon: Icon,
  current,
  previous,
  format = (n) => n.toLocaleString('pt-BR'),
  valueColor,
  orientation,
  hint,
}: CompKpiProps) {
  return (
    <Card className={surfaceClassName}>
      <CardContent className="flex flex-col gap-2 pb-4 pt-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={cn('text-3xl font-bold leading-none tracking-tight', valueColor ?? 'text-foreground')}>
          {format(current)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">
            {hint ?? `Anterior: ${format(previous)}`}
          </span>
          <DeltaBadge current={current} previous={previous} orientation={orientation} />
        </div>
      </CardContent>
    </Card>
  );
}

function ComparativeKpiSkeleton() {
  return (
    <Card className={surfaceClassName}>
      <CardContent className="flex flex-col gap-3 pb-4 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
        <div className="flex items-center justify-between gap-2 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

type ComparativeData = {
  periodA: { label: string; from: string; to: string };
  periodB: { label: string; from: string; to: string };
  sla: {
    a: { slaPercent: number; slaUtilPercent: number; total: number; concluded: number; withinSla: number; withinSlaUtil: number };
    b: { slaPercent: number; slaUtilPercent: number; total: number; concluded: number; withinSla: number; withinSlaUtil: number };
  };
  atendimentos: {
    a: { total: number; reparos: number; instalacoes: number; byType: AtendByType[] };
    b: { total: number; reparos: number; instalacoes: number; byType: AtendByType[] };
  };
  qualidade: {
    a: { IQIv: number; IQRv: number; ICT: number; RST: number };
    b: { IQIv: number; IQRv: number; ICT: number; RST: number };
  };
  suporte: {
    a: { total: number; agentes: number };
    b: { total: number; agentes: number };
  };
};

type AtendByType = { type: string; total: number };

function QualitySubCard({
  label,
  current,
  previous,
  icon: Icon,
  accent,
}: {
  label: string;
  current: number;
  previous: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg', accent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <DeltaBadge current={current} previous={previous} orientation="lower-better" />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{current.toLocaleString('pt-BR')}</span>
        <span className="text-xs text-muted-foreground">B: {previous.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  current,
  previous,
  orientation,
}: {
  label: string;
  current: number;
  previous: number;
  orientation: DeltaDirection;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-base font-semibold text-foreground">{current.toLocaleString('pt-BR')}</div>
          <div className="text-[11px] text-muted-foreground">B: {previous.toLocaleString('pt-BR')}</div>
        </div>
        <DeltaBadge current={current} previous={previous} orientation={orientation} />
      </div>
    </div>
  );
}

function formatActivityLabel(type: string): string {
  const mapped = ACTIVITY_LABELS[type];
  if (mapped) return mapped;
  if (!type) return 'Sem tipo';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function activityDeltaOrientation(type: string): DeltaDirection {
  const lower = type.toLowerCase();
  return LOWER_BETTER_TYPES.some((term) => lower.includes(term))
    ? 'lower-better'
    : 'higher-better';
}

function activitySortRank(type: string): number {
  const lower = type.toLowerCase();
  const lastIndex = LAST_TYPE_ORDER.findIndex((term) => lower.includes(term));
  if (lastIndex >= 0) return 100 + lastIndex;

  const productiveIndex = PRODUCTIVE_TYPE_ORDER.findIndex((term) => lower.includes(term));
  if (productiveIndex >= 0) return productiveIndex;

  return 50;
}

function getDefaultRanges(): { a: DateRange; b: DateRange } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const aFrom = new Date(y, m, 1);
  const aTo = new Date(y, m + 1, 0);
  const bFrom = new Date(y, m - 1, 1);
  const bTo = new Date(y, m, 0);
  return {
    a: { from: aFrom, to: aTo },
    b: { from: bFrom, to: bTo },
  };
}

function toYMD(d: Date | undefined): string | null {
  if (!d) return null;
  return format(d, 'yyyy-MM-dd');
}

function ResumoSlaPageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);
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

  const defaults = useMemo(() => getDefaultRanges(), []);
  const [rangeA, setRangeA] = useState<DateRange | undefined>(defaults.a);
  const [rangeB, setRangeB] = useState<DateRange | undefined>(defaults.b);

  const aFrom = toYMD(rangeA?.from);
  const aTo = toYMD(rangeA?.to);
  const bFrom = toYMD(rangeB?.from);
  const bTo = toYMD(rangeB?.to);

  const { data: comparativeRes, isLoading: isComparativeLoading } = useQuery({
    queryKey: ['comparative-summary', aFrom, aTo, bFrom, bTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (aFrom) params.set('aFrom', aFrom);
      if (aTo) params.set('aTo', aTo);
      if (bFrom) params.set('bFrom', bFrom);
      if (bTo) params.set('bTo', bTo);
      const res = await fetch(`/api/comparative-summary?${params.toString()}`);
      if (!res.ok) throw new Error(`comparative-summary error: ${res.status}`);
      return res.json();
    },
    enabled: Boolean(aFrom && aTo && bFrom && bTo),
  });

  const comparative: ComparativeData | undefined = comparativeRes?.data;

  const rawData = data?.data || [];

  const uniquePeriods = useMemo(
    () =>
      Array.from<string>(
        new Set(rawData.map((r: any) => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`))
      ).sort(),
    [rawData]
  );

  const activeTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rawData) {
      if (r.slaTargetHours !== null && r.slaTargetHours !== undefined) {
        set.add(ACTIVITY_LABELS[r.activityType] || r.activityType);
      }
    }
    const order = [
      'Instalação Nova',
      'Instalação Reativação',
      'Reparo',
      'Mudança de Endereço',
      'Mudança de Plano',
      'Retorno',
    ];
    return Array.from(set).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, 'pt-BR');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [rawData]);

  type CellData = { pct: number; total: number; concluded: number };

  const monthlyData = useMemo(() => {
    return uniquePeriods
      .map((periodKey: string) => {
        const [pYearStr, pMonthStr] = periodKey.split('-');
        const pYear = Number(pYearStr);
        const pMonth = Number(pMonthStr);
        const monthRecords = rawData.filter(
          (r: any) => r.periodYear === pYear && r.periodMonth === pMonth
        );

        const monthObj: any = {
          name: `${MONTH_NAMES[pMonth - 1]}/${pYearStr.slice(-2)}`,
          totalOS: 0,
          cells: {} as Record<string, CellData>,
        };

        let totalConc = 0;
        let totalCorrido = 0;
        let totalAtividades = 0;

        for (const r of monthRecords) {
          const concluded = Number(r.concluded);
          const corrido = Number(r.withinSlaCorrido);
          const total = Number(r.total);

          if (r.slaTargetHours !== null && r.slaTargetHours !== undefined) {
            totalConc += concluded;
            totalCorrido += corrido;
          }
          totalAtividades += total;

          const type = ACTIVITY_LABELS[r.activityType] || r.activityType;
          if (r.slaTargetHours !== null && r.slaTargetHours !== undefined) {
            const pct = concluded > 0 ? Math.round((corrido / concluded) * 100) : 0;
            monthObj[type] = pct;
            monthObj.cells[type] = { pct, total, concluded };
          }
        }

        monthObj.Geral = totalConc > 0 ? Math.round((totalCorrido / totalConc) * 100) : 0;
        monthObj.totalOS = totalAtividades;

        return monthObj;
      })
      .filter((m: any) => m.totalOS > 0);
  }, [uniquePeriods, rawData]);

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
  const generalLineColor = isDark ? '#e2e8f0' : '#0f172a';

  const slaA = comparative?.sla.a.slaPercent ?? 0;
  const slaB = comparative?.sla.b.slaPercent ?? 0;
  const qualityATotal = comparative
    ? comparative.qualidade.a.IQIv + comparative.qualidade.a.IQRv + comparative.qualidade.a.ICT
    : 0;
  const qualityBTotal = comparative
    ? comparative.qualidade.b.IQIv + comparative.qualidade.b.IQRv + comparative.qualidade.b.ICT
    : 0;
  const attendanceBreakdown = useMemo(() => {
    if (!comparative) return [];

    const previousByType = new Map(
      (comparative.atendimentos.b.byType ?? []).map((item) => [item.type, item.total])
    );

    return [...(comparative.atendimentos.a.byType ?? [])]
      .filter((item) => item.type.toLowerCase() !== 'em aberto')
      .sort((a, b) => {
        const rankDiff = activitySortRank(a.type) - activitySortRank(b.type);
        if (rankDiff !== 0) return rankDiff;
        return formatActivityLabel(a.type).localeCompare(formatActivityLabel(b.type), 'pt-BR');
      })
      .map((item) => ({
        type: item.type,
        label: formatActivityLabel(item.type),
        current: item.total,
        previous: previousByType.get(item.type) ?? 0,
        orientation: activityDeltaOrientation(item.type),
      }));
  }, [comparative]);

  return (
    <PageLayout
      title="Visão Geral Operacional"
      description="Índices comparativos e tendências — selecione os dois períodos para comparar."
    >
      {/* Bloco 1 — Seletores de período */}
      <Card className={surfaceClassName}>
        <CardContent className="flex flex-col gap-4 pb-4 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Período A
                {comparative && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {comparative.periodA.label}
                  </span>
                )}
              </div>
              <DatePickerWithRange date={rangeA} setDate={setRangeA} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-full border border-muted-foreground/60 bg-transparent" />
                Período B
                {comparative && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {comparative.periodB.label}
                  </span>
                )}
              </div>
              <DatePickerWithRange date={rangeB} setDate={setRangeB} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {comparative && (
              <>
                <Badge
                  variant="outline"
                  className="gap-1.5 border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300"
                >
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  A: {comparative.periodA.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1.5 border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  <span className="h-2 w-2 rounded-full border border-muted-foreground/60 bg-transparent" />
                  B: {comparative.periodB.label}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2 — KPI Cards comparativos */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {isComparativeLoading || !comparative ? (
          [...Array(5)].map((_, i) => <ComparativeKpiSkeleton key={i} />)
        ) : (
          <>
            <ComparativeKpi
              label="SLA Útil %"
              icon={ShieldCheck}
              current={slaA}
              previous={slaB}
              format={(n) => `${n.toFixed(1)}%`}
              valueColor={getSlaStatus(slaA).color}
              orientation="higher-better"
              hint={`B: ${slaB.toFixed(1)}%`}
            />
            <ComparativeKpi
              label="Total Atendimentos"
              icon={ClipboardList}
              current={comparative.atendimentos.a.total}
              previous={comparative.atendimentos.b.total}
              orientation="higher-better"
            />
            <ComparativeKpi
              label="Suporte (ligações)"
              icon={Headphones}
              current={comparative.suporte.a.total}
              previous={comparative.suporte.b.total}
              orientation="neutral"
            />
            <ComparativeKpi
              label="Qualidade Total"
              icon={Sparkles}
              current={qualityATotal}
              previous={qualityBTotal}
              orientation="lower-better"
              hint={`IQIv + IQRv + ICT — B: ${qualityBTotal.toLocaleString('pt-BR')}`}
            />
          </>
        )}
      </div>

      {/* Bloco 3 — Painel de Qualidade */}
      <Card className={surfaceClassName}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Indicadores de Qualidade</CardTitle>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-xs text-muted-foreground">
            Quanto menor, melhor
          </Badge>
        </CardHeader>
        <CardContent>
          {isComparativeLoading || !comparative ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QualitySubCard
                label="IQIv"
                current={comparative.qualidade.a.IQIv}
                previous={comparative.qualidade.b.IQIv}
                icon={Activity}
                accent="bg-amber-500/15 text-amber-600 dark:text-amber-400"
              />
              <QualitySubCard
                label="IQRv"
                current={comparative.qualidade.a.IQRv}
                previous={comparative.qualidade.b.IQRv}
                icon={Wrench}
                accent="bg-orange-500/15 text-orange-600 dark:text-orange-400"
              />
              <QualitySubCard
                label="ICT"
                current={comparative.qualidade.a.ICT}
                previous={comparative.qualidade.b.ICT}
                icon={Layers}
                accent="bg-purple-500/15 text-purple-600 dark:text-purple-400"
              />
              <QualitySubCard
                label="RST"
                current={comparative.qualidade.a.RST}
                previous={comparative.qualidade.b.RST}
                icon={AlertTriangle}
                accent="bg-rose-500/15 text-rose-600 dark:text-rose-400"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloco 4 — Breakdown lateral */}
      <div className="w-full">
        <Card className={surfaceClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breakdown de Atendimentos</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição por tipo no período A vs B</p>
          </CardHeader>
          <CardContent>
            {isComparativeLoading || !comparative ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <div>
                {attendanceBreakdown.map((item) => (
                  <BreakdownRow
                    key={item.type}
                    label={item.label}
                    current={item.current}
                    previous={item.previous}
                    orientation={item.orientation}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Bloco 5 — KPI cards históricos + filtro global de SLA */}
      <Card className={surfaceClassName}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          <div>
            <CardTitle className="text-base">Histórico Mensal de SLA</CardTitle>
            <p className="text-xs text-muted-foreground">Visão consolidada por mês — baseado no filtro global</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border/80 bg-background/80 text-xs text-muted-foreground">
              Meta Ouro: {SLA_META}%
            </Badge>
            <GlobalDateFilter />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              Sem dados para o periodo selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  SLA Medio Geral
                </div>
                <div className={`text-2xl font-bold ${getSlaStatus(avgGeral).color}`}>{avgGeral}%</div>
                <div className="mt-1 text-xs text-muted-foreground">{getSlaStatus(avgGeral).label}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  Melhor Mes
                </div>
                <div className="text-2xl font-bold text-green-500">{bestMonth?.Geral ?? 0}%</div>
                <div className="mt-1 text-xs text-muted-foreground">{bestMonth?.name ?? '-'}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Pior Mes
                </div>
                <div className={`text-2xl font-bold ${getSlaStatus(worstMonth?.Geral ?? 0).color}`}>
                  {worstMonth?.Geral ?? 0}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{worstMonth?.name ?? '-'}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Meses com Meta
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {monthsAboveMeta}
                  <span className="text-base font-normal text-muted-foreground">
                    /{monthlyData.length}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Acima de {SLA_META}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloco 6 — Heatmap SLA por Tipo × Mês */}
      <Card className={surfaceClassName}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Heatmap SLA por Tipo × Mês</CardTitle>
            <p className="text-xs text-muted-foreground">SLA Útil % por combinação tipo de atividade × período</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border/80 bg-background/80 text-xs text-muted-foreground">
              Meta Ouro: {SLA_META}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : monthlyData.length === 0 || activeTypes.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              Sem dados para o periodo selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <div
                  className="grid gap-1 text-xs"
                  style={{
                    gridTemplateColumns: `minmax(160px,180px) repeat(${monthlyData.length}, minmax(64px,1fr))`,
                  }}
                >
                  {/* Header row */}
                  <div className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tipo / Mês
                  </div>
                  {monthlyData.map((m: any) => (
                    <div
                      key={m.name}
                      className="rounded-md bg-muted/30 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground"
                    >
                      {m.name}
                    </div>
                  ))}

                  {/* Data rows */}
                  {activeTypes.map((type) => (
                    <div key={type} className="contents">
                      <div className="flex items-center gap-2 border-r border-border/40 px-2 py-2 text-[12px] font-medium text-foreground">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: activityColor(type) }}
                        />
                        <span className="truncate" title={type}>
                          {type}
                        </span>
                      </div>
                      {monthlyData.map((m: any) => {
                        const cell: CellData | undefined = m.cells?.[type];
                        const hasData = cell !== undefined;
                        const tooltipTitle = hasData
                          ? `${type} — ${m.name}\nSLA Útil: ${cell.pct}% (${cell.concluded}/${cell.total} OS)`
                          : `${type} — ${m.name}\nSem dados`;
                        return (
                          <div
                            key={`${type}-${m.name}`}
                            title={tooltipTitle}
                            className={cn(
                              'flex h-12 items-center justify-center rounded-md border text-[12px] font-semibold transition-colors',
                              heatCellBg(hasData ? cell.pct : null)
                            )}
                          >
                            {hasData ? `${cell.pct}%` : '—'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                <span className="font-medium">Legenda:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500/80" /> ≥ {SLA_META}%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500/80" /> 80–94%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-red-500/80" /> &lt; 80%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-border/60 bg-muted/40" /> Sem dados
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloco 7 — Linhas de evolução por tipo */}
      <Card className={surfaceClassName}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Evolução por Tipo de Atividade</CardTitle>
            <p className="text-xs text-muted-foreground">SLA Útil % mês a mês — comparação entre tipos e linha geral</p>
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-xs text-muted-foreground">
            Meta Ouro: {SLA_META}%
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : monthlyData.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              Sem dados para o periodo selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={monthlyData} margin={{ top: 16, right: 24, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<PercentTooltip />}
                  cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={(value) => <span style={{ color: axisColor }}>{value}</span>}
                />
                <ReferenceLine
                  y={SLA_META}
                  stroke={refLineColor}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Meta ${SLA_META}%`,
                    position: 'insideTopRight',
                    fill: refLineColor,
                    fontSize: 10,
                  }}
                />
                {activeTypes.map((type) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    name={type}
                    stroke={activityColor(type)}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1.5, fill: activityColor(type) }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    connectNulls
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="Geral"
                  name="Geral (média)"
                  stroke={generalLineColor}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
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
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
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
