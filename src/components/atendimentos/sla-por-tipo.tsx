'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { cn } from '@/lib/utils';

export interface SlaByTypeItem {
  activityType: string;
  slaTargetHours: number | null;
  total: number;
  concluded: number;
  withinSlaCorrido: number;
  slaCorridoPercent: number;
  withinSlaUtil: number;
  slaUtilPercent: number;
}

const RETIRADA_TYPES = new Set(['retirada_kit', 'Retirada de Kit', 'Retirada Kit']);

function isRetirada(activityType: string) {
  return RETIRADA_TYPES.has(activityType);
}

function metaLabel(hours: number | null) {
  return hours != null ? `${hours}h` : 'Sem meta';
}

function barColor(percent: number) {
  if (percent >= 95) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SlaPorTipo({ data }: { data?: SlaByTypeItem[] }) {
  const items = (data ?? []).filter((t) => t.total > 0);
  if (items.length === 0) return null;

  const ordered = [...items].sort((a, b) => b.total - a.total);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">SLA por Tipo de Atividade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((item) => {
            const label = ACTIVITY_LABELS[item.activityType] ?? item.activityType;
            const percent = Math.round(item.slaCorridoPercent * 1000) / 10;
            const retirada = isRetirada(item.activityType);
            return (
              <div
                key={item.activityType}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                  {retirada ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                      72h — não compõe meta geral
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{metaLabel(item.slaTargetHours)}</Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {item.concluded > 0 ? `${percent.toLocaleString('pt-BR')}%` : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">corrido</span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                  <div
                    className={cn('h-full transition-all', barColor(percent))}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {item.withinSlaCorrido} / {item.concluded} dentro da meta
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
