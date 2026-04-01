'use client';

import { Building2, MessageSquareWarning, UserRoundX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';

export function CancellationsKpiCards({ totals }: { totals: any }) {
  const items = [
    {
      title: 'Clientes cancelados',
      value: formatNumber(totals?.cancelledClients || 0),
      helper: 'Total de registros cancelados no período',
      icon: UserRoundX,
    },
    {
      title: 'Cidades impactadas',
      value: formatNumber(totals?.cities || 0),
      helper: 'Quantidade de cidades com cancelamentos',
      icon: Building2,
    },
    {
      title: 'Motivos mapeados',
      value: formatNumber(totals?.mappedReasons || 0),
      helper: 'Diversidade de motivos ou observações catalogadas',
      icon: MessageSquareWarning,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
