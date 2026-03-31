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
import { formatSLATime } from '@/lib/services/sla-engine';
import { FileText } from 'lucide-react';

export function QualityTable({ records }: { records: any[] }) {
  if (!records || records.length === 0) {
    return (
      <Card className="flex-1">
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-20" />
          <p>Nenhum registro de qualidade encontrado para os filtros atuais.</p>
        </CardContent>
      </Card>
    );
  }

  const getIndicatorColor = (indicator: string) => {
    switch (indicator) {
      case 'IQIv':
      case 'IQRv':
        return 'bg-blue-600/20 text-blue-600 border-blue-600/30';
      case 'RTV':
      case 'RST':
        return 'bg-red-600/20 text-red-600 border-red-600/30';
      case 'ICT':
        return 'bg-amber-600/20 text-amber-600 border-amber-600/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <Card className="flex-1 overflow-hidden flex flex-col">
      <CardHeader>
        <CardTitle>Relação de Registros de Qualidade</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead>Nº OS</TableHead>
              <TableHead>Indicador</TableHead>
              <TableHead>Técnico</TableHead>
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
                  {r.technicianName || <span className="text-muted-foreground text-xs italic">Não atribuído</span>}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={r.clientName || ''}>
                  {r.clientName}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{r.city || '-'}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={r.plan}>
                    {r.plan}
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <p className="text-xs text-muted-foreground line-clamp-2" title={r.reason}>
                    {r.reason}
                  </p>
                </TableCell>
                <TableCell className="text-right text-xs whitespace-nowrap">
                  {r.openedAt ? new Date(r.openedAt).toLocaleDateString('pt-BR') : '-'}
                  {r.durationSeconds ? (
                    <div className="text-muted-foreground font-mono mt-1">
                      (Duração: {formatSLATime(r.durationSeconds)})
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
