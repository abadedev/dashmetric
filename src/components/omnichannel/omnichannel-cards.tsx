'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PhoneCall, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';

type OmnichannelRecord = {
  agente: string;
  quantidade: number | null;
  tma: string | null;
  tme: string | null;
};

interface OmnichannelSummaryCardsProps {
  totalAtendentes: number;
  totalAtendimentos: number;
  melhorTma: OmnichannelRecord | null;
  piorTma: OmnichannelRecord | null;
  melhorTme: OmnichannelRecord | null;
  piorTme: OmnichannelRecord | null;
}

export function OmnichannelSummaryCards({
  totalAtendentes,
  totalAtendimentos,
  melhorTma,
  piorTma,
  melhorTme,
  piorTme,
}: OmnichannelSummaryCardsProps) {
  const cards = [
    {
      label: 'Atendentes',
      value: totalAtendentes,
      extra: 'agentes ativos no período',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Total de Atendimentos',
      value: totalAtendimentos.toLocaleString('pt-BR'),
      extra: 'ligações no período',
      icon: PhoneCall,
      color: 'text-emerald-500',
    },
    {
      label: 'Melhor TMA',
      value: melhorTma?.tma ?? '—',
      extra: melhorTma?.agente ?? 'sem dados',
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      label: 'Pior TMA',
      value: piorTma?.tma ?? '—',
      extra: piorTma?.agente ?? 'sem dados',
      icon: TrendingDown,
      color: 'text-red-500',
    },
    {
      label: 'Melhor TME',
      value: melhorTme?.tme ?? '—',
      extra: melhorTme?.agente ?? 'sem dados',
      icon: Clock,
      color: 'text-sky-500',
    },
    {
      label: 'Pior TME',
      value: piorTme?.tme ?? '—',
      extra: piorTme?.agente ?? 'sem dados',
      icon: Activity,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium pr-2">{card.label}</CardTitle>
              <Icon className={`h-4 w-4 flex-shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground truncate">{card.extra}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
