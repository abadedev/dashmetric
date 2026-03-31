'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils/format';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { Badge } from '@/components/ui/badge';

export function SlaByTypeTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>SLA por Tipo de Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">Sem dados para o período selecionado.</div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar por volume
  const sortedData = [...data].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>SLA por Tipo de Atendimento</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Atividade</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">SLA Útil</TableHead>
              <TableHead className="text-right">SLA Corr.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const utilPct = row.slaUtilPercent;
              const hasMeta = row.slaTargetHours !== null;
              const isUtilOk = utilPct >= 0.95;

              return (
                <TableRow key={row.activityType}>
                  <TableCell className="font-medium">
                    {ACTIVITY_LABELS[row.activityType] || row.activityType}
                  </TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">
                    {hasMeta ? `${row.slaTargetHours}h` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasMeta ? (
                      <Badge variant={isUtilOk ? 'default' : 'destructive'} className={isUtilOk ? 'bg-green-600' : ''}>
                        {formatPercent(utilPct)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {hasMeta ? formatPercent(row.slaCorridoPercent) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
