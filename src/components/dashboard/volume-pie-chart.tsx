'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  '#0ea5e9', // Azul
  '#22c55e', // Verde
  '#f59e0b', // Amarelo
  '#ef4444', // Vermelho
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#64748b', // Cinza
];

export function VolumePieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Volume por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">Sem dados.</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .map((d) => ({
      name: ACTIVITY_LABELS[d.activityType] || d.activityType,
      value: Number(d.total),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Volume por Tipo</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value} OS`, 'Volume']}
              contentStyle={{ borderRadius: '8px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
