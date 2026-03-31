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
import { Badge } from '@/components/ui/badge';
import { HeadphonesIcon } from 'lucide-react';

export function SupportTable({ records }: { records: any[] }) {
  if (!records || records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <HeadphonesIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>Nenhum registro de suporte encontrado para este período.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedRecords = [...records].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Desempenho por Atendente</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Atendente</TableHead>
              <TableHead className="text-right">Abertas c/ OS</TableHead>
              <TableHead className="text-right">Sem Manut.</TableHead>
              <TableHead className="text-right font-bold text-primary">Total Triagem</TableHead>
              <TableHead className="text-right">Aproveitamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((r) => {
              const perc = r.percentage ? parseFloat(r.percentage) : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {r.attendantName}
                  </TableCell>
                  <TableCell className="text-right">{r.openedManutExt}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.withoutManut}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{r.total}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={perc >= 80 ? 'default' : 'secondary'} className={perc >= 80 ? 'bg-green-600' : ''}>
                      {perc.toFixed(2)}%
                    </Badge>
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
