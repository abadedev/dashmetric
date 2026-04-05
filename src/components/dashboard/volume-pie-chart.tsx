'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'color-mix(in oklab, var(--chart-1) 65%, var(--chart-2) 35%)',
  'color-mix(in oklab, var(--chart-2) 50%, var(--foreground) 20%)',
];

export function VolumePieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Volume por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">Sem dados.</div>
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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Volume por Tipo</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-w-0">
        <div className="w-full min-w-0">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="46%"
                innerRadius={62}
                outerRadius={84}
                paddingAngle={3}
                stroke="transparent"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} OS`, 'Volume']}
                contentStyle={{
                  borderRadius: '18px',
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  color: 'var(--popover-foreground)',
                  boxShadow: '0 18px 48px -24px rgba(15, 23, 42, 0.35)',
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '12px', color: 'var(--muted-foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
