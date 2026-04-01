'use client';

import { Handshake, PackageCheck, Target, TrendingUp, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatPercent } from '@/lib/utils/format';

export function SalesKpiCards({ totals }: { totals: any }) {
  const items = [
    {
      title: 'Clientes negociados',
      value: formatNumber(totals?.negotiatedClients || 0),
      helper: 'Base comercial consolidada no período',
      icon: Handshake,
    },
    {
      title: 'Clientes fechados',
      value: formatNumber(totals?.closedClients || 0),
      helper: 'Clientes que avançaram até fechamento/instalação',
      icon: UserRoundCheck,
    },
    {
      title: 'Leads marketing digital',
      value: formatNumber(totals?.marketingLeads || 0),
      helper: 'Indicações rastreadas como marketing digital',
      icon: TrendingUp,
    },
    {
      title: 'Pedidos instalados',
      value: formatNumber(totals?.installedOrders || 0),
      helper: 'Ordens de instalação concluídas',
      icon: PackageCheck,
    },
    {
      title: 'Pedidos cancelados',
      value: formatNumber(totals?.cancelledOrders || 0),
      helper: 'Cancelamentos antes da instalação',
      icon: UserRoundX,
    },
    {
      title: 'Taxa de conversão',
      value: formatPercent(totals?.conversionRate || 0, 2),
      helper: 'Fechados sobre negociados',
      icon: Target,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
