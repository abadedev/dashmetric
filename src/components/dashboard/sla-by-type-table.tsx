'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { formatPercent } from '@/lib/utils/format';

export function SlaByTypeTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>SLA por Tipo de Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">Sem dados para o período selecionado.</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>SLA por Tipo de Atividade</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Atividade</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">SLA</TableHead>
              <TableHead className="text-right">SLA Útil (informativo)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const corridoPct = row.slaCorridoPercent;
              const hasMeta = row.slaTargetHours !== null;
              const isOk = corridoPct >= 0.95;

              return (
                <TableRow key={row.activityType}>
                  <TableCell className="font-medium text-foreground">
                    {ACTIVITY_LABELS[row.activityType] || row.activityType}
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.total}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {hasMeta ? `${row.slaTargetHours}h` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasMeta ? (
                      <Badge
                        variant={isOk ? 'default' : 'destructive'}
                        className={isOk ? 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : ''}
                      >
                        {formatPercent(corridoPct)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {hasMeta ? formatPercent(row.slaUtilPercent) : '-'}
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
