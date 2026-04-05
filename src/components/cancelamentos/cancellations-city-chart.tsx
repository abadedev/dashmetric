'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CancellationsCityChart({ data }: { data: Array<{ city: string; total: number }> }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancelamentos por cidade</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Sem dados de cancelamento para o período.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Cancelamentos por cidade</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="city" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
