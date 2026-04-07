'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateDisplay } from '@/components/ui/state-display';

type ChartRecord = {
  agente: string;
  quantidade: number | null;
  tma: string | null;
  tmia: string | null;
};

function firstName(name: string) {
  return name.split(' ')[0] ?? name;
}

function toSeconds(t: string | null): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return 0;
}

const TOOLTIP_STYLE = {
  borderRadius: '16px',
  backgroundColor: 'rgba(15,23,42,0.96)',
  border: '1px solid rgba(148,163,184,0.16)',
  color: '#fff',
  boxShadow: '0 18px 40px -24px rgba(15,23,42,0.45)',
};

// ─── Quantidade por atendente ────────────────────────────────────────────────

export function OmnichannelQuantidadeChart({ records }: { records: ChartRecord[] }) {
  const data = [...records]
    .sort((a, b) => (b.quantidade ?? 0) - (a.quantidade ?? 0))
    .slice(0, 12)
    .map((r) => ({ name: firstName(r.agente), agente: r.agente, qty: r.quantidade ?? 0 }));

  if (!data.length) return <EmptyChart title="Atendimentos por Agente" />;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ranking</p>
            <CardTitle className="text-lg font-semibold tracking-tight">Atendimentos por Agente</CardTitle>
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
            Top {data.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [v, 'Atendimentos']}
              labelFormatter={(_, p) => p?.[0]?.payload?.agente ?? ''}
            />
            <Bar dataKey="qty" name="Atendimentos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── TMA por atendente ───────────────────────────────────────────────────────

export function OmnichannelTmaChart({ records }: { records: ChartRecord[] }) {
  const data = [...records]
    .filter((r) => r.tma)
    .sort((a, b) => toSeconds(a.tma) - toSeconds(b.tma))
    .slice(0, 12)
    .map((r) => ({ name: firstName(r.agente), agente: r.agente, tma: r.tma, secs: toSeconds(r.tma) }));

  if (!data.length) return <EmptyChart title="TMA por Agente" />;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Comparativo</p>
            <CardTitle className="text-lg font-semibold tracking-tight">TMA por Agente</CardTitle>
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
            Melhor → Pior
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="s" />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, _, p) => [p?.payload?.tma ?? v, 'TMA']}
              labelFormatter={(_, p) => p?.[0]?.payload?.agente ?? ''}
            />
            <Bar dataKey="secs" name="TMA (seg)" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── TMIA por atendente ──────────────────────────────────────────────────────

export function OmnichannelTmiaChart({ records }: { records: ChartRecord[] }) {
  const data = [...records]
    .filter((r) => r.tmia)
    .sort((a, b) => toSeconds(a.tmia) - toSeconds(b.tmia))
    .slice(0, 12)
    .map((r) => ({ name: firstName(r.agente), agente: r.agente, tmia: r.tmia, secs: toSeconds(r.tmia) }));

  if (!data.length) return <EmptyChart title="TMIA por Agente" />;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Comparativo</p>
            <CardTitle className="text-lg font-semibold tracking-tight">TMIA por Agente</CardTitle>
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
            Melhor → Pior
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="s" />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, _, p) => [p?.payload?.tmia ?? v, 'TMIA']}
              labelFormatter={(_, p) => p?.[0]?.payload?.agente ?? ''}
            />
            <Bar dataKey="secs" name="TMIA (seg)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyChart({ title }: { title: string }) {
  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardContent className="p-0">
        <StateDisplay
          variant="empty"
          icon={<BarChart3 className="h-8 w-8 text-muted-foreground/50" />}
          title={`Sem dados — ${title}`}
          description="Importe uma planilha Matrix Go para visualizar este gráfico."
          className="min-h-[280px]"
        />
      </CardContent>
    </Card>
  );
}
