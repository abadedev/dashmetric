'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateDisplay } from '@/components/ui/state-display';
import { TableIcon } from 'lucide-react';

type OmnichannelRow = {
  id: number;
  agente: string;
  isHuman: boolean;
  quantidade: number | null;
  te: string | null;
  tme: string | null;
  ta: string | null;
  tma: string | null;
  tp: string | null;
  tmp: string | null;
  tmic: string | null;
  tmia: string | null;
  at20s: number | null;
  at60s: number | null;
  percentual: string | null;
};

export function OmnichannelTable({ records }: { records: OmnichannelRow[] }) {
  const displayed = records;

  if (!displayed.length) {
    return (
      <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
        <CardContent className="p-0">
          <StateDisplay
            variant="empty"
            icon={<TableIcon className="h-8 w-8 text-muted-foreground/50" />}
            title="Sem registros"
            description="Importe uma planilha Matrix Go (Omnichannel) para visualizar a tabela analítica."
            className="min-h-[200px]"
          />
        </CardContent>
      </Card>
    );
  }

  const col = 'border border-border/40 px-3 py-2 text-left text-xs';
  const th = `${col} font-semibold text-muted-foreground bg-muted/30`;
  const td = `${col} align-middle`;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Detalhamento
            </p>
            <CardTitle className="text-lg font-semibold tracking-tight">Tabela Analítica</CardTitle>
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
            {displayed.length} agente{displayed.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              {['Agente','Qtd','TE','TME','TA','TMA','TP','TMP','TMIC','TMIA','≤20s','≤60s','%'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => (
              <tr
                key={r.id}
                className="transition-colors hover:bg-muted/20"
              >
                <td className={td}>
                  <span className="font-medium text-foreground/90">{r.agente}</span>
                  {!r.isHuman && (
                    <Badge variant="secondary" className="ml-2 text-[10px] py-0">Bot</Badge>
                  )}
                </td>
                <td className={`${td} tabular-nums font-medium`}>{r.quantidade ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.te ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tme ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.ta ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tma ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tp ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tmp ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tmic ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.tmia ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.at20s ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{r.at60s ?? '—'}</td>
                <td className={`${td} tabular-nums`}>
                  {r.percentual ? `${parseFloat(r.percentual).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
