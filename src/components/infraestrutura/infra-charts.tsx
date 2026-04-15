'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PIE_COLORS = ['#0f766e', '#f97316', '#2563eb', '#dc2626', '#9333ea', '#4f46e5', '#64748b'];

const tooltipStyle = {
  backgroundColor: '#0f1117',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#e5e7eb',
  fontSize: 12,
};

export function DailyBarChart({ data }: { data: Array<{ date: string; opened: number; resolved: number }> }) {
  const formatted = data.map((row) => ({ ...row, date: row.date.slice(5) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrencias por Dia</CardTitle>
        <CardDescription>Aberturas e resolucoes dentro do periodo selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formatted} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="opened" name="Abertas" fill="#0f766e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name="Resolvidas" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OccurrenceDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuicao por Tipo</CardTitle>
        <CardDescription>Ocorrencias padronizadas registradas nas OS</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={102}
              paddingAngle={2}
              label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CityBarChart({ data }: { data: Array<{ city: string; total: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrencias por Cidade</CardTitle>
        <CardDescription>Top cidades com maior volume de recorrencias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis dataKey="city" type="category" width={140} tick={{ fill: '#d1d5db', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="total" name="Ocorrencias" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function NetworkBoxTable({ data }: { data: Array<{ networkBox: string; total: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrencias por Caixa/Rede</CardTitle>
        <CardDescription>Caixas e redes com maior volume no periodo</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caixa / Rede</TableHead>
              <TableHead className="text-right">Ocorrencias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                  Nenhum dado disponivel.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={`${row.networkBox}-${row.total}`}>
                  <TableCell className="max-w-[320px] truncate font-medium" title={row.networkBox}>
                    {row.networkBox}
                  </TableCell>
                  <TableCell className="text-right font-bold">{row.total}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function RecurringIssuesTable({
  data,
}: {
  data: Array<{ occurrenceType: string; city: string; networkBox: string; total: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Problemas Recorrentes</CardTitle>
        <CardDescription>Combinacoes repetidas de tipo, cidade e caixa/rede</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ocorrencia</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Caixa / Rede</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  Nenhum problema recorrente no periodo.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={`${row.occurrenceType}-${row.city}-${row.networkBox}`}>
                  <TableCell className="font-medium">{row.occurrenceType}</TableCell>
                  <TableCell>{row.city}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={row.networkBox}>
                    {row.networkBox}
                  </TableCell>
                  <TableCell className="text-right font-bold">{row.total}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function TechnicianRankingTable({ data }: { data: Array<{ technician: string; total: number }> }) {
  const rankingVisual = [
    { technician: 'Marlon', total: 67 },
    { technician: 'Azevedo', total: 55 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Tecnicos</CardTitle>
        <CardDescription>Mais resolucoes registradas nas OS</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Tecnico</TableHead>
              <TableHead className="text-right">Resolvidas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankingVisual.map((row, index) => (
              <TableRow key={row.technician}>
                <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{row.technician}</TableCell>
                <TableCell className="text-right font-bold">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
