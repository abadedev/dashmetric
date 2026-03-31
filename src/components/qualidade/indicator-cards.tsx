'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';

const INDICATORS = [
  { key: 'IQIv', label: 'IQIv (Reparo Pós Instal)', target: 7, desc: 'Meta: ≤ 7%', icon: Target },
  { key: 'IQRv', label: 'IQRv (Reparo Reincid)', target: 7, desc: 'Meta: ≤ 7%', icon: RotateCcw },
  { key: 'RTV', label: 'RTV (Reclamação Varejo)', target: 3, desc: 'Meta: ≤ 3%', icon: AlertTriangle },
  { key: 'RST', label: 'RST (Reclamação Téc.)', target: 3, desc: 'Meta: ≤ 3%', icon: AlertTriangle },
  { key: 'ICT', label: 'ICT (Inviabilidade Téc)', target: 3, desc: 'Meta: ≤ 3%', icon: XCircle },
];

export function IndicatorCards({ data }: { data: any[] }) {
  if (!data) return null;

  // Como data aqui são OSs/registros filtrados brutos, 
  // vamos apenas agrupar por indicador para mostrar os totais na view.
  // Em um cenário real, o percentual exigiria a base total de clientes/OSs.
  // Como simplificação, exibiremos o volume absoluto retornado pelos filtros.

  const counts: Record<string, number> = {};
  data.forEach((r) => {
    counts[r.indicator] = (counts[r.indicator] || 0) + 1;
  });

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {INDICATORS.map((ind) => {
        const value = counts[ind.key] || 0;
        const Icon = ind.icon;
        
        return (
          <Card key={ind.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium pr-2">{ind.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">Registros filtrados</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
