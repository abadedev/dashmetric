'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { HeadphonesIcon } from 'lucide-react';

type SupportSummaryItem = {
  tipo: string;
  quantidade: number;
  percentual: number;
};

type SupportTableProps = {
  summary: SupportSummaryItem[];
  total: number;
  from?: Date | null;
  to?: Date | null;
};

function formatPeriodLabel(from?: Date | null, to?: Date | null) {
  if (!from || !to) {
    return 'Resumo final consolidado';
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const labels: string[] = [];

  while (cursor <= end) {
    const monthLabel = formatter.format(cursor).replace('.', '');
    labels.push(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const uniqueLabels = labels.filter((label, index) => labels.indexOf(label) === index);
  return `Resumo final consolidado ${uniqueLabels.join(' + ')} ${to.getFullYear()}`;
}

function formatPercentage(value: number) {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export function SupportTable({ summary, total, from, to }: SupportTableProps) {
  if (!summary.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <HeadphonesIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>Nenhum registro de suporte encontrado para este período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-300 bg-white text-slate-900">
      <div className="border-b border-slate-300 bg-[#1f4fa3] px-4 py-2 text-center text-base font-bold text-white">
        Resumo por Tipo
      </div>
      <div className="border-b border-slate-300 bg-[#1e8f3d] px-4 py-2 text-center text-sm font-semibold text-white">
        {formatPeriodLabel(from, to)}
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-300 bg-[#2a63bb] hover:bg-[#2a63bb]">
              <TableHead className="w-[60%] border-r border-slate-300 text-center font-bold text-white">
                Tipo de Atendimento
              </TableHead>
              <TableHead className="w-[20%] border-r border-slate-300 text-center font-bold text-white">
                Quantidade
              </TableHead>
              <TableHead className="w-[20%] text-center font-bold text-white">
                % do Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((item) => (
              <TableRow key={item.tipo} className="border-slate-300 bg-[#f5efe1] hover:bg-[#f5efe1]">
                <TableCell className="border-r border-slate-300 align-top text-sm font-medium leading-5">
                  {item.tipo}
                </TableCell>
                <TableCell className="border-r border-slate-300 text-center text-sm font-semibold">
                  {item.quantidade}
                </TableCell>
                <TableCell className="text-center text-sm font-semibold">
                  {formatPercentage(item.percentual)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-slate-300 bg-[#f7ea8f] hover:bg-[#f7ea8f]">
              <TableCell className="border-r border-slate-300 text-sm font-bold">
                Total
              </TableCell>
              <TableCell className="border-r border-slate-300 text-center text-sm font-bold">
                {total}
              </TableCell>
              <TableCell className="text-center text-sm font-bold">
                {formatPercentage(100)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
