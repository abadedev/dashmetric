'use client';

import { Fragment, useMemo, type ElementType } from 'react';
import { Briefcase, Receipt, Wrench, Inbox, HeadphonesIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StateDisplay } from '@/components/ui/state-display';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils/format';

export type Segmento = 'Técnico' | 'Comercial' | 'Financeiro' | 'Outros';

export interface LinhaDetalhada {
  segmento: Segmento;
  problemaReclamado: string;
  causa: string;
  quantidade: number;
  percentualDoTotal: number;
}

export interface TotaisDetalhados {
  geral: number;
  tecnico: number;
  comercial: number;
  financeiro: number;
  outros: number;
  percentualComercial: number;
  percentualFinanceiro: number;
}

const SEGMENTO_META: Record<
  Segmento,
  { label: string; icon: string; iconLucide: ElementType; accent: string }
> = {
  Comercial: {
    label: 'Comercial',
    icon: '💼',
    iconLucide: Briefcase,
    accent: 'bg-amber-500/10 text-amber-400',
  },
  Financeiro: {
    label: 'Financeiro',
    icon: '💰',
    iconLucide: Receipt,
    accent: 'bg-emerald-500/10 text-emerald-400',
  },
  Técnico: {
    label: 'Técnico',
    icon: '🔧',
    iconLucide: Wrench,
    accent: 'bg-sky-500/10 text-sky-400',
  },
  Outros: {
    label: 'Outros',
    icon: '📋',
    iconLucide: Inbox,
    accent: 'bg-zinc-500/10 text-zinc-400',
  },
};

const ORDEM_SEGMENTO: Segmento[] = ['Comercial', 'Financeiro', 'Técnico', 'Outros'];

function fmtPct(value: number) {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('rounded-md p-1.5', accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function SupportDetailedTable({
  linhas,
  totais,
}: {
  linhas: LinhaDetalhada[];
  totais: TotaisDetalhados;
}) {
  const linhasPorSegmento = useMemo(() => {
    const map = new Map<Segmento, LinhaDetalhada[]>();
    for (const seg of ORDEM_SEGMENTO) map.set(seg, []);
    for (const linha of linhas) {
      const seg = (ORDEM_SEGMENTO.includes(linha.segmento) ? linha.segmento : 'Outros') as Segmento;
      map.get(seg)!.push(linha);
    }
    return map;
  }, [linhas]);

  if (totais.geral === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <StateDisplay
            variant="empty"
            icon={<HeadphonesIcon className="h-8 w-8 text-muted-foreground/50" />}
            title="Sem atendimentos detalhados no período"
            description="Os dados detalhados aparecerão aqui após a importação do CSV do RBXSoft."
            className="min-h-[260px]"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total geral"
          value={formatNumber(totais.geral)}
          subtitle="atendimentos no período"
          icon={HeadphonesIcon}
          accent="bg-indigo-500/10 text-indigo-400"
        />
        <KpiCard
          title="Comercial"
          value={formatNumber(totais.comercial)}
          subtitle={`${fmtPct(totais.percentualComercial)} do total`}
          icon={Briefcase}
          accent="bg-amber-500/10 text-amber-400"
        />
        <KpiCard
          title="Financeiro"
          value={formatNumber(totais.financeiro)}
          subtitle={`${fmtPct(totais.percentualFinanceiro)} do total`}
          icon={Receipt}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <KpiCard
          title="Técnico"
          value={formatNumber(totais.tecnico)}
          subtitle={
            totais.geral > 0
              ? `${fmtPct((totais.tecnico / totais.geral) * 100)} do total`
              : '0,00% do total'
          }
          icon={Wrench}
          accent="bg-sky-500/10 text-sky-400"
        />
      </div>

      <Card>
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Suporte por telefone — detalhado
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Atendimentos por segmento e categoria operacional
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada linha representa uma categoria consolidada a partir de ProblemaReclamado e Causa.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">Problema reclamado</TableHead>
                <TableHead className="w-[38%]">Causa</TableHead>
                <TableHead className="w-[10%] text-right">Qtd</TableHead>
                <TableHead className="w-[10%] text-right">% do total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORDEM_SEGMENTO.map((seg) => {
                const rows = linhasPorSegmento.get(seg) ?? [];
                if (rows.length === 0) return null;
                const meta = SEGMENTO_META[seg];
                const totalSegmento = rows.reduce((a, r) => a + r.quantidade, 0);
                return (
                  <Fragment key={seg}>
                    <TableRow key={`${seg}-header`} className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="border-y border-border/60 bg-muted/30 px-4 py-4 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3">
                          <div className="text-sm font-semibold uppercase tracking-widest text-foreground">
                            {meta.label}
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatNumber(totalSegmento)} atendimentos ·{' '}
                            {totais.geral > 0
                              ? fmtPct((totalSegmento / totais.geral) * 100)
                              : '0,00%'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {rows.map((r, idx) => (
                      <TableRow key={`${seg}-${idx}-${r.problemaReclamado}-${r.causa}`}>
                        <TableCell className="text-sm text-foreground">
                          {r.problemaReclamado || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.causa || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
                          {formatNumber(r.quantidade)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {fmtPct(r.percentualDoTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
