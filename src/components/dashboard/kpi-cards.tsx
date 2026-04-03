'use client';

import { Activity, Target, Timer, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

const KPI_STYLES = {
  info: {
    iconWrap: 'bg-primary/12 text-primary ring-1 ring-primary/15',
    accent: 'bg-primary',
  },
  success: {
    iconWrap: 'bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400',
    accent: 'bg-emerald-500',
  },
  performance: {
    iconWrap: 'bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400',
    accent: 'bg-violet-500',
  },
  alert: {
    iconWrap: 'bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400',
    accent: 'bg-amber-500',
  },
};

function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
  tone,
  valueClassName,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Activity;
  tone: keyof typeof KPI_STYLES;
  valueClassName?: string;
}) {
  const style = KPI_STYLES[tone];

  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1.5 w-full', style.accent)} />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', style.iconWrap)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold tracking-tight text-foreground', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ data }: { data: any }) {
  if (!data) return null;

  const mSla = data.metaSLA || 0.95;
  const isUtilOk = data.slaUtilGeral >= mSla;
  const isCorridoOk = data.slaCorridoGeral >= mSla;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total de Atendimentos"
        value={formatNumber(data.totalAtendimentos || 0)}
        caption="Ordens abertas no recorte atual"
        icon={Activity}
        tone="info"
      />

      <KpiCard
        title="SLA Útil Geral"
        value={formatPercent(data.slaUtilGeral || 0)}
        caption={`Meta operacional: ${formatPercent(mSla)}`}
        icon={Timer}
        tone={isUtilOk ? 'success' : 'alert'}
        valueClassName={isUtilOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
      />

      <KpiCard
        title="SLA Corrido Geral"
        value={formatPercent(data.slaCorridoGeral || 0)}
        caption="Leitura integral sem cortes de horário"
        icon={TrendingUp}
        tone="performance"
        valueClassName={isCorridoOk ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'}
      />

      <KpiCard
        title="Status Geral da Meta"
        value={isUtilOk ? 'ATINGIDA' : 'FALHA'}
        caption="Baseado no SLA útil do período"
        icon={Target}
        tone={isUtilOk ? 'success' : 'alert'}
        valueClassName={isUtilOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
      />
    </div>
  );
}
