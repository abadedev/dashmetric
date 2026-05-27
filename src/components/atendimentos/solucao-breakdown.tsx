'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OsLike {
  activityType?: string | null;
  solution?: string | null;
}

const MAX_ROWS = 10;

export function SolucaoBreakdown({ data, type }: { data?: OsLike[]; type?: string }) {
  const isReparo = type === 'reparo' || type === 'Reparo';

  const { rows, totalCategorias } = useMemo(() => {
    if (!isReparo || !data) return { rows: [] as Array<{ solucao: string; ocorrencias: number }>, totalCategorias: 0 };

    const counts = new Map<string, { label: string; count: number }>();
    for (const os of data) {
      const raw = os.solution?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const entry = counts.get(key) ?? { label: raw, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }

    const ordered = Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
      .map((e) => ({ solucao: e.label, ocorrencias: e.count }));

    return { rows: ordered.slice(0, MAX_ROWS), totalCategorias: ordered.length };
  }, [data, isReparo]);

  if (!isReparo || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Classificação de Solução — Reparos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {totalCategorias} {totalCategorias === 1 ? 'categoria distinta' : 'categorias distintas'}
          {totalCategorias > MAX_ROWS ? ` (exibindo top ${MAX_ROWS})` : ''}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Problema/Solução</TableHead>
              <TableHead className="text-right">Ocorrências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.solucao}>
                <TableCell className="font-medium">{row.solucao}</TableCell>
                <TableCell className="text-right tabular-nums">{row.ocorrencias}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
