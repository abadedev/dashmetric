'use client';

import { FileText } from 'lucide-react';
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
import { formatSLATime } from '@/lib/services/sla-engine';

export function QualityTable({ records }: { records: any[] }) {
  if (!records || records.length === 0) {
    return (
      <Card className="flex-1">
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <FileText className="mb-4 h-12 w-12 opacity-20" />
          <p>Nenhum registro de qualidade encontrado para os filtros atuais.</p>
        </CardContent>
      </Card>
    );
  }

  const getIndicatorColor = (indicator: string) => {
    switch (indicator) {
      case 'IQIv':
      case 'IQRv':
        return 'border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300';
      case 'RTV':
      case 'RST':
        return 'border-destructive/15 bg-destructive/8 text-destructive';
      case 'ICT':
        return 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      default:
        return 'border-border/70 bg-background/80 text-foreground';
    }
  };

  return (
    <Card className="flex flex-1 flex-col overflow-hidden border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader>
        <CardTitle>Relacao de Registros de Qualidade</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/35 backdrop-blur-sm">
            <TableRow>
              <TableHead>Login</TableHead>
              <TableHead>Indicador</TableHead>
              <TableHead>Tecnico</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cidade / Plano</TableHead>
              <TableHead className="w-[300px]">Motivo</TableHead>
              <TableHead className="text-right">Abertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {r.osNumber || 'S/N'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`whitespace-nowrap ${getIndicatorColor(r.indicator)}`}>
                    {r.indicator}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {r.technicianName || (
                    <span className="text-xs italic text-muted-foreground">Nao atribuido</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={r.clientName || ''}>
                  {r.clientName}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{r.city || '-'}</div>
                  <div className="max-w-[120px] truncate text-xs text-muted-foreground" title={r.plan}>
                    {r.plan}
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <p className="line-clamp-2 text-xs text-muted-foreground" title={r.reason}>
                    {r.reason}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-xs">
                  {r.openedAt ? new Date(r.openedAt).toLocaleDateString('pt-BR') : '-'}
                  {r.durationSeconds ? (
                    <div className="mt-1 font-mono text-muted-foreground">
                      (Duracao: {formatSLATime(r.durationSeconds)})
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
