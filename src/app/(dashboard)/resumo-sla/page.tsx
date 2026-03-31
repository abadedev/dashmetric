'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { Badge } from '@/components/ui/badge';

import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { startOfMonth, endOfMonth } from 'date-fns';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ResumoSlaPage() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['sla-summary', qs],
    queryFn: async () => {
      const res = await fetch(`/api/sla-summary?${qs}`);
      return res.json();
    },
  });

  const rawData = data?.data || [];
  
  // Extrair pares de (ano, mês) únicos dos dados
  const uniquePeriods = Array.from<string>(
    new Set(rawData.map((r: any) => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`))
  ).sort();

  // Transformar dados em série temporal baseada nas datas recebidas
  const monthlyData = uniquePeriods.map((periodKey: string) => {
    const [pYearStr, pMonthStr] = periodKey.split('-');
    const pYear = Number(pYearStr);
    const pMonth = Number(pMonthStr);
    const monthRecords = rawData.filter((r: any) => 
      r.periodYear === pYear && r.periodMonth === pMonth
    );
    
    const monthObj: any = { name: `${MONTH_NAMES[pMonth - 1]}/${pYearStr.slice(-2)}`, totalOS: 0 };
    
    // Calcula o percentual geral do mês
    const totalConc = monthRecords.reduce((s: number, r: any) => s + Number(r.concluded), 0);
    const totalUtil = monthRecords.reduce((s: number, r: any) => s + Number(r.withinSlaUtil), 0);
    
    monthObj.Geral = totalConc > 0 ? Math.round((totalUtil / totalConc) * 100) : 0;
    monthObj.totalOS = totalConc;

    // Calcula por tipo
    monthRecords.forEach((r: any) => {
      const type = ACTIVITY_LABELS[r.activityType] || r.activityType;
      const pct = Number(r.concluded) > 0 ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100) : 0;
      monthObj[type] = pct;
    });

    return monthObj;
  }).filter((m: any) => m.totalOS > 0);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold">Resumo SLA P/ Período</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Evolução mensal do percentual de SLA atingido por tipo de atividade.
          </p>
        </div>
        <div className="flex gap-4">
          <GlobalDateFilter />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : monthlyData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Sem dados para o período selecionado.
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 min-h-[500px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Histórico de Desempenho (SLA Útil %)</CardTitle>
            <Badge variant="outline" className="text-muted-foreground border-dashed">
              Meta Ouro: 95%
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 h-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`}/>
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ borderRadius: '8px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                
                {/* Barras Lado a Lado para comparação rápida */}
                <Bar dataKey="Geral" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Geral da Empresa" barSize={40} />
                <Bar dataKey="Instalação Nova" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Reparo" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Mudança de Endereço" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
