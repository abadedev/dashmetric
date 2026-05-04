'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PIE_COLORS = ['#0f766e', '#f97316', '#2563eb', '#dc2626', '#9333ea', '#4f46e5', '#64748b'];
const HIDDEN_NETWORK_BOXES = new Set(['CA-10.4.7']);

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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ocorrencias por Dia</CardTitle>
            <CardDescription>Aberturas e resolucoes dentro do periodo selecionado</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0f766e]" />
              Abertas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              Resolvidas
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={formatted} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAberta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResolvida" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="opened" name="Abertas" stroke="#0f766e" strokeWidth={2} fill="url(#gradAberta)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="resolved" name="Resolvidas" stroke="#3b82f6" strokeWidth={2} fill="url(#gradResolvida)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OccurrenceDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Distribuicao por Tipo</CardTitle>
        <CardDescription>Ocorrencias padronizadas registradas nas OS</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {sorted.map((entry, index) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            const barWidth = total > 0 ? (entry.value / max) * 100 : 0;
            return (
              <div key={entry.name} className="flex items-center gap-3 group">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-xs text-muted-foreground truncate w-44 flex-shrink-0 group-hover:text-foreground transition-colors" title={entry.name}>
                  {entry.name}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-8 text-right flex-shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function CityBarChart({ data }: { data: Array<{ city: string; total: number }> }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Ocorrencias por Cidade</CardTitle>
        <CardDescription>Top cidades com maior volume de recorrencias</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis dataKey="city" type="category" width={140} tick={{ fill: '#d1d5db', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="total" name="Ocorrencias" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-col">
          {data.map((entry, index) => (
            <div key={entry.city} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono w-4 text-right flex-shrink-0">{index + 1}</span>
                <span className="text-muted-foreground truncate" title={entry.city}>{entry.city}</span>
              </span>
              <span className="font-semibold text-foreground pl-4 flex-shrink-0">{entry.total}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OccurrenceByTypeTable({ data }: { data: Array<{ name: string; value: number }> }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrencias por Tipo</CardTitle>
        <CardDescription>Tipos com maior volume no periodo</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ocorrencias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                  Nenhum dado disponivel.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-bold">{row.value}</TableCell>
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
  const visibleData = data.filter((row) => !HIDDEN_NETWORK_BOXES.has(row.networkBox));

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
            {visibleData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  Nenhum problema recorrente no periodo.
                </TableCell>
              </TableRow>
            ) : (
              visibleData.map((row) => (
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
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  Nenhum dado disponivel.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={row.technician}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.technician}</TableCell>
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
