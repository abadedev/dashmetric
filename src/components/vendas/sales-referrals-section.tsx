'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { StateDisplay } from '@/components/ui/state-display';
import { Gift, TableIcon, TimerReset, UserRoundCheck, UserRoundX } from 'lucide-react';

type SalesReferralFilters = {
  from?: string;
  to?: string;
  city?: string;
  search?: string;
};

type SalesReferralResponse = {
  summary: {
    total: number;
    contratado: number;
    pendente: number;
    reprovado: number;
    conversionRate: number;
  };
  records: Array<{
    id: number;
    cadastroAt: string | null;
    indicante: string | null;
    indicado: string | null;
    contratado: string | null;
    telefoneIndicado: string | null;
    cidade: string | null;
    status: 'contratado' | 'pendente' | 'reprovado';
    rawStatus: string | null;
    periodMonth: number;
    periodYear: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_LABELS = {
  contratado: 'Contratado',
  pendente: 'Pendente',
  reprovado: 'Reprovado',
} as const;

const STATUS_BADGE_CLASS = {
  contratado: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  pendente: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  reprovado: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
} as const;

function formatCadastro(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function SalesReferralsSection({ filters }: { filters: SalesReferralFilters }) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.set('from', filters.from);
  if (filters.to) queryParams.set('to', filters.to);
  if (filters.city) queryParams.set('city', filters.city);
  if (filters.search) queryParams.set('search', filters.search);
  queryParams.set('pageSize', '20');

  const qs = queryParams.toString();

  const { data, isLoading } = useQuery<SalesReferralResponse>({
    queryKey: ['sales-referrals', qs],
    queryFn: async () => {
      const response = await fetch(`/api/sales-referrals?${qs}`);
      if (!response.ok) throw new Error(`sales-referrals error: ${response.status}`);
      return response.json();
    },
    retry: false,
  });

  const summary = data?.summary;
  const records = data?.records ?? [];

  const items = [
    {
      title: 'Total de indicações',
      value: formatNumber(summary?.total ?? 0),
      helper: 'Registros recebidos no período filtrado',
      icon: Gift,
    },
    {
      title: 'Contratados',
      value: formatNumber(summary?.contratado ?? 0),
      helper: 'Indicações convertidas em contratação',
      icon: UserRoundCheck,
    },
    {
      title: 'Pendentes',
      value: formatNumber(summary?.pendente ?? 0),
      helper: 'Indicações ainda em acompanhamento',
      icon: TimerReset,
    },
    {
      title: 'Reprovados',
      value: formatNumber(summary?.reprovado ?? 0),
      helper: 'Sem conversão ou descartados',
      icon: UserRoundX,
    },
    {
      title: 'Taxa de conversão',
      value: formatPercent(summary?.conversionRate ?? 0, 2),
      helper: 'Contratados sobre o total',
      icon: Gift,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Vendas · Indique um Amigo
              </p>
              <CardTitle className="text-lg font-semibold tracking-tight">Indicações</CardTitle>
              <CardDescription>
                Leituras de indicação vinculadas ao módulo de Vendas, com status normalizado.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-border/80 bg-background/80 text-muted-foreground">
              {formatNumber(summary?.total ?? 0)} registro(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : records.length === 0 ? (
            <StateDisplay
              variant="empty"
              icon={<TableIcon className="h-8 w-8 text-muted-foreground/50" />}
              title="Sem indicações"
              description="Importe um CSV de Indique um Amigo para visualizar o resumo e a listagem."
              className="min-h-[160px]"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Indicante</TableHead>
                    <TableHead>Indicado</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatCadastro(record.cadastroAt)}</TableCell>
                      <TableCell>{record.indicante ?? '—'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{record.indicado ?? '—'}</div>
                          {record.contratado ? (
                            <p className="text-xs text-muted-foreground">Contratado: {record.contratado}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{record.telefoneIndicado ?? '—'}</TableCell>
                      <TableCell>{record.cidade ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE_CLASS[record.status]} variant="outline">
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
