'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StateDisplay } from '@/components/ui/state-display';
import { formatNumber } from '@/lib/utils/format';

type SupportChartRecord = {
  attendantName: string;
  openedManutExt: number;
  withoutManut: number;
  total: number;
  sharePercent: number;
};

export function SupportChart({ records }: { records: SupportChartRecord[] }) {
  if (!records || records.length === 0) {
    return (
      <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
        <CardContent className="p-0">
          <StateDisplay
            variant="empty"
            icon={<BarChart3 className="h-8 w-8 text-muted-foreground/50" />}
            title="Sem dados para o grafico"
            description="Nao ha triagens consolidadas de suporte para os filtros atuais."
            className="min-h-[320px]"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = records
    .map((record) => ({
      name: record.attendantName.split(' ')[0] || record.attendantName,
      attendantName: record.attendantName,
      comOs: Number(record.openedManutExt),
      semOs: Number(record.withoutManut),
      total: Number(record.total),
      sharePercent: Number(record.sharePercent),
    }))
    .sort((left, right) => right.total - left.total || left.attendantName.localeCompare(right.attendantName))
    .slice(0, 10);

  const totalChartVolume = chartData.reduce((acc, item) => acc + item.total, 0);

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="gap-4 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Triagem operacional
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">Com OS x Sem OS</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Distribuicao dos atendimentos por atendente, ordenada do maior volume para o menor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/80 bg-background/80 text-foreground">
              Top {chartData.length} atendentes
            </Badge>
            <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
              {formatNumber(totalChartVolume)} atendimentos
            </Badge>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/72 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.045] text-foreground ring-1 ring-border/70">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Leitura do grafico
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada barra combina atendimentos que <span className="font-medium text-foreground/85">abriram manutencao</span> e atendimentos <span className="font-medium text-foreground/85">resolvidos sem OS</span>.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="h-[380px] pt-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.18)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{
                borderRadius: '16px',
                backgroundColor: 'rgba(15,23,42,0.96)',
                border: '1px solid rgba(148,163,184,0.16)',
                color: '#fff',
                boxShadow: '0 18px 40px -24px rgba(15,23,42,0.45)',
              }}
              formatter={(value, name) => [formatNumber(Number(value ?? 0)), name === 'comOs' ? 'Com OS' : 'Sem OS']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.attendantName ?? ''}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value === 'comOs' ? 'Com OS' : 'Sem OS'}</span>}
            />
            <Bar dataKey="comOs" stackId="support" name="comOs" fill="#0f172a" radius={[0, 0, 6, 6]} />
            <Bar dataKey="semOs" stackId="support" name="semOs" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
