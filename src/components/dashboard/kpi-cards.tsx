'use client';

import { Activity, Target, Timer, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

const KPI_STYLES = {
  info: {
    iconWrap: 'bg-foreground/[0.045] text-foreground ring-1 ring-border/70',
    eyebrow: 'text-muted-foreground',
    indicator: 'bg-foreground/35',
    value: 'text-foreground',
  },
  success: {
    iconWrap: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/12 dark:text-emerald-300',
    eyebrow: 'text-emerald-700/80 dark:text-emerald-300/80',
    indicator: 'bg-emerald-500/70',
    value: 'text-foreground',
  },
  performance: {
    iconWrap: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/12 dark:text-sky-300',
    eyebrow: 'text-sky-700/80 dark:text-sky-300/80',
    indicator: 'bg-sky-500/70',
    value: 'text-foreground',
  },
  alert: {
    iconWrap: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/12 dark:text-amber-300',
    eyebrow: 'text-amber-700/80 dark:text-amber-300/80',
    indicator: 'bg-amber-500/70',
    value: 'text-foreground',
  },
} as const;

function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
  tone,
  eyebrow,
  valueClassName,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Activity;
  tone: keyof typeof KPI_STYLES;
  eyebrow: string;
  valueClassName?: string;
}) {
  const style = KPI_STYLES[tone];

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),color-mix(in_oklab,var(--card)_98%,black_2%))] shadow-[0_16px_40px_-28px_rgba(15,23,42,0.32)]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn('size-1.5 rounded-full', style.indicator)} />
            <span className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', style.eyebrow)}>
              {eyebrow}
            </span>
          </div>
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          <p className="text-xs leading-5 text-muted-foreground">{caption}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', style.iconWrap)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-[2rem] font-semibold tracking-[-0.04em]', style.value, valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ data }: { data: any }) {
  if (!data) return null;

  const mSla = data.metaSLA || 0.95;
  const slaGeral = data.slaGeral ?? data.slaCorridoGeral;
  const isSlaOk = slaGeral >= mSla;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total de Atividades"
        value={formatNumber(data.totalAtendimentos || 0)}
        caption="Ordens abertas no recorte atual"
        icon={Activity}
        tone="info"
        eyebrow="Volume"
      />

      <KpiCard
        title="SLA"
        value={formatPercent(slaGeral || 0)}
        caption={`Meta operacional: ${formatPercent(mSla)} (24h corridas) — exclui Retirada de Kit`}
        icon={TrendingUp}
        tone={isSlaOk ? 'success' : 'alert'}
        eyebrow={isSlaOk ? 'Dentro da meta' : 'Atencao'}
        valueClassName="text-foreground"
      />

      <KpiCard
        title="SLA Útil (informativo)"
        value={formatPercent(data.slaUtilGeral || 0)}
        caption="Considera apenas horario comercial"
        icon={Timer}
        tone="info"
        eyebrow="Referencia"
        valueClassName="text-foreground"
      />

      <KpiCard
        title="Status Geral da Meta"
        value={isSlaOk ? 'ATINGIDA' : 'Fora da Meta'}
        caption="Baseado no SLA de 24h corridas"
        icon={Target}
        tone={isSlaOk ? 'success' : 'alert'}
        eyebrow={isSlaOk ? 'Meta atingida' : 'Fora da meta'}
        valueClassName={isSlaOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}
      />
    </div>
  );
}
