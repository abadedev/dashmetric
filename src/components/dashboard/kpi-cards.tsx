'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent, formatNumber } from '@/lib/utils/format';
import { Activity, Target, Timer, TrendingUp } from 'lucide-react';

export function KpiCards({ data }: { data: any }) {
  if (!data) return null;

  const mSla = data.metaSLA || 0.95;
  const isUtilOk = data.slaUtilGeral >= mSla;
  const isCorridoOk = data.slaCorridoGeral >= mSla;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(data.totalAtendimentos || 0)}</div>
          <p className="text-xs text-muted-foreground">OS abertas no período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SLA Útil Geral</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isUtilOk ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercent(data.slaUtilGeral || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Meta: {formatPercent(mSla)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SLA Corrido Geral</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isCorridoOk ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercent(data.slaCorridoGeral || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Visão completa s/ cortes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status Geral da Meta</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isUtilOk ? 'text-green-500' : 'text-red-500'}`}>
            {isUtilOk ? 'ATINGIDA' : 'FALHA'}
          </div>
          <p className="text-xs text-muted-foreground">
            Baseado no SLA Útil
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
