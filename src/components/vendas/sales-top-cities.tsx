'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function SalesTopCities({ data }: { data: Array<{ city: string; total: number }> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Volume por cidade</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((item) => (
                <TableRow key={item.city}>
                  <TableCell>{item.city}</TableCell>
                  <TableCell className="text-right font-semibold">{item.total}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Sem dados para o período selecionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
