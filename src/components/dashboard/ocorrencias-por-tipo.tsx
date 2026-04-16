'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';

interface OcorrenciasItem {
  activityType: string;
  total: number | string;
}

export function OcorrenciasPorTipo({ data }: { data: OcorrenciasItem[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ocorrências por Tipo</CardTitle>
          <CardDescription>Distribuição de OS por tipo de atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">Sem dados.</div>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrências por Tipo</CardTitle>
        <CardDescription>Tipos com maior volume no período</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TIPO</TableHead>
              <TableHead className="text-right">OCORRÊNCIAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => (
              <TableRow key={item.activityType}>
                <TableCell className="font-medium">
                  {ACTIVITY_LABELS[item.activityType] || item.activityType}
                </TableCell>
                <TableCell className="text-right font-bold">{item.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
