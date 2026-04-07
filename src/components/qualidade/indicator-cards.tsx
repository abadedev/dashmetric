'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Target, XCircle } from 'lucide-react';

export function IndicatorCards({
  byIndicator,
  totalReparos,
}: {
  byIndicator: Record<string, number>;
  totalReparos: number;
}) {
  const t = byIndicator ?? {};

  const cards = [
    { label: 'IQIv (Reparo Pós Instal)', value: t['IQIv'] ?? 0,                            icon: Target        },
    { label: 'IQRv (Reparo Reincid)',    value: t['IQRv'] ?? 0,                            icon: RotateCcw     },
    { label: 'RTV (Reclamação Varejo)',  value: totalReparos,                              icon: AlertTriangle },
    { label: 'RST (Reclamação Téc.)',    value: (t['IQIv'] ?? 0) + (t['IQRv'] ?? 0),      icon: AlertTriangle },
    { label: 'ICT (Inviabilidade Téc)', value: t['ICT'] ?? 0,                             icon: XCircle       },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium pr-2">{card.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">Total no período</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
