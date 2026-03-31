'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SupportChart({ records }: { records: any[] }) {
  if (!records || records.length === 0) return null;

  const chartData = records
    .map((r) => ({
      name: r.attendantName.split(' ')[0], // Pega só o primeiro nome
      'Com OS': Number(r.openedManutExt),
      'Sem OS': Number(r.withoutManut),
    }))
    .sort((a, b) => (b['Com OS'] + b['Sem OS']) - (a['Com OS'] + a['Sem OS']))
    .slice(0, 10); // Top 10 para não poluir

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 10 — Tipo de Triagem (Com Manut x Sem Manut)</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ borderRadius: '8px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Com OS" stackId="a" fill="#0ea5e9" radius={[0, 0, 4, 4]} />
            <Bar dataKey="Sem OS" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
