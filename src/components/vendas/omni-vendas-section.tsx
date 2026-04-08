'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateDisplay } from '@/components/ui/state-display';
import { TableIcon, ChevronDown } from 'lucide-react';

type OmniVendasRecord = {
  id: number;
  agente: string;
  quantidade: number;
  tma: string | null;
  tempoFila: string | null;
  tempoAtendimento: string | null;
  tempoPendencia: string | null;
  tmic: string | null;
  tmia: string | null;
  periodMonth: number;
  periodYear: number;
};

type Period = { month: number; year: number };

const MONTH_NAMES = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function periodLabel(p: Period): string {
  return `${MONTH_NAMES[p.month] ?? p.month}/${p.year}`;
}

export function OmniVendasSection() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  const qs = new URLSearchParams();
  if (selectedPeriod) {
    qs.set('month', String(selectedPeriod.month));
    qs.set('year',  String(selectedPeriod.year));
  }

  const { data, isLoading } = useQuery<{ records: OmniVendasRecord[]; periods: Period[] }>({
    queryKey: ['omni-vendas', qs.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/omnichannel-vendas?${qs.toString()}`);
      if (!res.ok) throw new Error(`omnichannel-vendas error: ${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const records = data?.records ?? [];
  const periods = data?.periods ?? [];

  const col = 'border border-border/40 px-3 py-2 text-left text-xs';
  const th  = `${col} font-semibold text-muted-foreground bg-muted/30`;
  const td  = `${col} align-middle`;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Omnichannel · Vendas
            </p>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Atendimentos por Agente
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {periods.length > 0 && (
              <div className="relative">
                <select
                  value={selectedPeriod ? `${selectedPeriod.month}-${selectedPeriod.year}` : ''}
                  onChange={(e) => {
                    if (!e.target.value) { setSelectedPeriod(null); return; }
                    const [m, y] = e.target.value.split('-').map(Number);
                    setSelectedPeriod({ month: m!, year: y! });
                  }}
                  className="appearance-none rounded-md border border-border/60 bg-background/80 px-3 py-1.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Todos os períodos</option>
                  {periods.map((p) => (
                    <option key={`${p.month}-${p.year}`} value={`${p.month}-${p.year}`}>
                      {periodLabel(p)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
            <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
              {records.length} agente{records.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : records.length === 0 ? (
          <StateDisplay
            variant="empty"
            icon={<TableIcon className="h-8 w-8 text-muted-foreground/50" />}
            title="Sem dados"
            description="Importe uma planilha Omni Vendas para visualizar os atendimentos por agente."
            className="min-h-[160px]"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr>
                  {['Agente', 'Atend.', 'TMA', 'Tempo em Fila', 'Tempo Atend.', 'Pendência', 'TMIC', 'TMIA'].map(
                    (h) => <th key={h} className={th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/20">
                    <td className={td}>
                      <span className="font-medium text-foreground/90">{r.agente}</span>
                    </td>
                    <td className={`${td} tabular-nums font-medium`}>{r.quantidade}</td>
                    <td className={`${td} tabular-nums`}>{r.tma ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{r.tempoFila ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{r.tempoAtendimento ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{r.tempoPendencia ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{r.tmic ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{r.tmia ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
