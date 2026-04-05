'use client';

import { HeadphonesIcon, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StateDisplay } from '@/components/ui/state-display';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNumber } from '@/lib/utils/format';

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
    return 'Consolidado do periodo selecionado';
  }

  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();

  if (sameMonth) {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(from);
  }

  return `${new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(from)} a ${new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(to)}`;
}

function formatPercentage(value: number) {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export function SupportTable({ summary, total, from, to }: SupportTableProps) {
  if (!summary.length) {
    return (
      <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
        <CardContent className="p-0">
          <StateDisplay
            variant="empty"
            icon={<HeadphonesIcon className="h-8 w-8 text-muted-foreground/50" />}
            title="Sem dados de suporte por tipo"
            description="Nao ha registros classificados para os filtros atuais."
            className="min-h-[260px]"
          />
        </CardContent>
      </Card>
    );
  }

  const topCategory = summary[0] ?? null;
  const periodLabel = formatPeriodLabel(from, to);

  return (
    <Card className="overflow-hidden border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader className="gap-4 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Suporte por telefone
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">Resumo por Tipo</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Consolidado das categorias classificadas automaticamente a partir de <span className="font-medium text-foreground/85">ProblemaReclamado</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/80 bg-background/80 text-foreground">
              {formatNumber(total)} atendimentos
            </Badge>
            <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
              {periodLabel}
            </Badge>
          </div>
        </div>

        {topCategory && (
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/72 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.045] text-foreground ring-1 ring-border/70">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Maior volume no periodo
              </p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">{topCategory.tipo}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(topCategory.quantidade)} registros, equivalentes a {formatPercentage(topCategory.percentual)} do total.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[58%]">Tipo de Atendimento</TableHead>
              <TableHead className="w-[21%] text-right">Quantidade</TableHead>
              <TableHead className="w-[21%] text-right">% do Total</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {summary.map((item, index) => (
              <TableRow key={item.tipo}>
                <TableCell className="whitespace-normal">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-full border border-border/70 bg-background/80 text-[11px] font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-5 text-foreground">{item.tipo}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold text-foreground">{formatNumber(item.quantidade)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold text-foreground">{formatPercentage(item.percentual)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="font-semibold text-foreground">Total geral</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatNumber(total)}</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatPercentage(100)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
