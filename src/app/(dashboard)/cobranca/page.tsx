'use client';

import { Suspense, useMemo, useState, type ElementType } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CalendarRange,
  Check,
  CheckCircle2,
  CircleSlash,
  FileSpreadsheet,
  Loader2,
  PhoneOff,
  Receipt,
  RotateCcw,
  Truck,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/state-display';
import { cn } from '@/lib/utils';

type TipoLista = 'boletos_vencidos' | 'pre_inativacao';

interface DadosResponse {
  filtros: { vencimentos: string[] };
  datasVencimentoDisponiveis: string[];
  boletos: {
    total: number;
    valorTotal: number;
    convertidos: number;
    valorConvertidos: number;
    emAberto: number;
    valorEmAberto: number;
    inativos: number;
    taxaConversao: number;
    porStatus: { status: string; count: number; valor: number }[];
    porCidade: { cidade: string; count: number; valor: number }[];
    porVencimento: { data: string; count: number; valor: number }[];
    porDataPagamento: { data: string; count: number }[];
    porPerfilAtraso: { perfil: string; count: number }[];
    porMotivo: { motivo: string; count: number }[];
  };
  preInativacao: {
    total: number;
    porStatusCrm: { status: string; count: number }[];
    porCidade: { cidade: string; count: number }[];
  };
  ultimoImport: {
    boletos: { nomeArquivo: string | null; importadoEm: string } | null;
    preInativacao: { nomeArquivo: string | null; importadoEm: string } | null;
  };
}

interface ImportResult {
  importId: number;
  totalRegistros: number;
  inseridos: number;
  atualizados: number;
  ignorados: number;
}

const STATUS_CRM_LABELS: Record<string, string> = {
  convertido: 'Convertido',
  sem_contato: 'Sem contato',
  desligou: 'Desligou',
  retirada_em_aberto: 'Retirada em aberto',
  retirada_finalizada: 'Retirada finalizada',
  cancelamento_confirmado: 'Cancelamento confirmado',
  promessa_pagamento: 'Promessa de pagamento',
  promessa_devolucao: 'Promessa de devolução',
  pendente: 'Pendente',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  'Em dia': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Bloqueado: 'bg-red-500/10 text-red-400 border-red-500/20',
  Inativo: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'Aviso de pendência': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const PERFIL_LABELS: Record<string, string> = {
  sim: 'Sim — perfil de atraso',
  nao: 'Não — pontual',
  sem_info: 'Sem informação',
};

const currency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDateBR = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });

function UploadDialog({
  tipoLista,
  label,
  description,
}: {
  tipoLista: TipoLista;
  label: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um arquivo.');
      const fd = new FormData();
      fd.append('arquivo', file);
      fd.append('tipoLista', tipoLista);
      const res = await fetch('/api/cobranca/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Falha no import.');
      return json as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['cobranca-dados'] });
      toast.success(`Import concluído: ${data.inseridos} inseridos, ${data.atualizados} atualizados.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function reset() {
    setFile(null);
    setResult(null);
    mutation.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            {label}
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-8 text-center transition-colors hover:bg-muted/50">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">
              {file ? file.name : 'Clique para selecionar um arquivo .xlsx'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </label>

          {result && (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
              <div className="font-semibold text-foreground">Resultado do import</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Total lido:</span>
                <span className="text-right font-medium text-foreground">{result.totalRegistros}</span>
                <span>Inseridos:</span>
                <span className="text-right font-medium text-emerald-500">{result.inseridos}</span>
                <span>Atualizados:</span>
                <span className="text-right font-medium text-amber-500">{result.atualizados}</span>
                <span>Ignorados:</span>
                <span className="text-right font-medium text-muted-foreground">{result.ignorados}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          <Button
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
        <div className="line-clamp-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthKey(iso: string): string {
  // iso = "2026-03-20" → "2026-03"
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
}

function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground/85 transition-colors hover:bg-accent/60 hover:text-foreground"
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border/70 bg-background group-hover:border-border'
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

function VencimentoFilter({
  disponiveis,
  selecionados,
  onApply,
}: {
  disponiveis: string[];
  selecionados: string[];
  onApply: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string[]>(selecionados);

  // Reset pending state whenever popover opens with current applied selection.
  const handleOpenChange = (next: boolean) => {
    if (next) setPending(selecionados);
    setOpen(next);
  };

  // Datas ordenadas da mais recente para a mais antiga.
  const datasOrdenadas = useMemo(
    () => [...disponiveis].sort((a, b) => b.localeCompare(a)),
    [disponiveis]
  );

  // Agrupa por mês mantendo a ordem desc.
  const grupos = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of datasOrdenadas) {
      const k = monthKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(d);
    }
    return Array.from(map.entries());
  }, [datasOrdenadas]);

  // Range exibido: min/max das datas selecionadas, ou min/max do total disponível.
  const referenceDates = (selecionados.length > 0 ? selecionados : disponiveis).slice().sort();
  const rangeMin = referenceDates[0];
  const rangeMax = referenceDates[referenceDates.length - 1];

  const todoPeriodo = pending.length === 0;
  const todoPeriodoApplied = selecionados.length === 0;

  const togglePending = (date: string) =>
    setPending((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]));

  const toggleTodoPeriodo = () => setPending([]);

  const apply = () => {
    onApply(pending);
    setOpen(false);
  };

  const disabled = disponiveis.length === 0;
  const labelText = disabled
    ? 'Sem datas disponíveis — importe a planilha de boletos'
    : rangeMin && rangeMax
      ? `Visualizando de ${formatDateBR(rangeMin)} até ${formatDateBR(rangeMax)}`
      : 'Visualizando todo o período';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between gap-3 px-4 py-2.5 text-left font-normal sm:w-auto"
          >
            <span className="flex items-center gap-2.5">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Período
                </span>
                <span className="text-sm font-medium text-foreground">{labelText}</span>
              </span>
            </span>
            {!todoPeriodoApplied && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {selecionados.length}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Filtrar por vencimento
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pending.length === 0
              ? 'Mostrando todas as datas'
              : `${pending.length} ${pending.length === 1 ? 'data selecionada' : 'datas selecionadas'}`}
          </p>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          <CheckboxRow checked={todoPeriodo} onChange={toggleTodoPeriodo}>
            <span className="font-medium">Todo o período</span>
          </CheckboxRow>

          {grupos.map(([key, datas]) => (
            <div key={key} className="mt-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {monthLabel(key)}
              </div>
              {datas.map((d) => (
                <CheckboxRow
                  key={d}
                  checked={pending.includes(d)}
                  onChange={() => togglePending(d)}
                >
                  {formatDateBR(d)}
                </CheckboxRow>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setPending(selecionados)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Descartar
          </button>
          <Button size="sm" onClick={apply}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DistribuicaoTabela({
  title,
  rows,
  keyLabel,
  showValue = false,
  showPercent = true,
}: {
  title: string;
  rows: { label: string; count: number; valor?: number; badgeClass?: string }[];
  keyLabel: string;
  showValue?: boolean;
  showPercent?: boolean;
}) {
  const total = useMemo(() => rows.reduce((a, r) => a + r.count, 0), [rows]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{keyLabel}</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                {showPercent && <TableHead className="text-right">%</TableHead>}
                {showValue && <TableHead className="text-right">Valor</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={1 + 1 + (showPercent ? 1 : 0) + (showValue ? 1 : 0)}
                    className="text-center text-muted-foreground"
                  >
                    Sem dados
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium">
                      {r.badgeClass ? (
                        <span className={cn('rounded-md border px-2 py-0.5 text-xs', r.badgeClass)}>
                          {r.label}
                        </span>
                      ) : (
                        r.label
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    {showPercent && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                    )}
                    {showValue && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.valor !== undefined ? currency(r.valor) : '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CobrancaPageContent() {
  const [vencimentos, setVencimentos] = useState<string[]>([]);

  const qs = useMemo(
    () => (vencimentos.length > 0 ? `?vencimentos=${vencimentos.join(',')}` : ''),
    [vencimentos]
  );

  const { data, isLoading } = useQuery<DadosResponse>({
    queryKey: ['cobranca-dados', vencimentos],
    queryFn: async () => {
      const res = await fetch(`/api/cobranca/dados${qs}`);
      if (!res.ok) throw new Error('Falha ao carregar dados');
      return res.json();
    },
  });

  const preStatusMap = useMemo(() => {
    const map = new Map<string, number>();
    data?.preInativacao.porStatusCrm.forEach((s) => map.set(s.status, s.count));
    return map;
  }, [data]);

  return (
    <PageLayout
      title="Cobrança"
      description="Conversão de boletos vencidos e pré-inativação. Status 'Em dia' = cliente convertido após abordagem."
      actions={
        <div className="flex flex-wrap gap-2">
          <UploadDialog
            tipoLista="boletos_vencidos"
            label="Boletos"
            description="Planilha de boletos vencidos."
          />
          <UploadDialog
            tipoLista="pre_inativacao"
            label="Pré-Inativação"
            description="Planilha de pré-inativação. Linhas verdes contam como convertidas."
          />
        </div>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : !data ? (
        <div className="text-center text-muted-foreground">Sem dados.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <VencimentoFilter
              disponiveis={data.datasVencimentoDisponiveis}
              selecionados={vencimentos}
              onApply={setVencimentos}
            />
            {vencimentos.length > 0 && (
              <button
                type="button"
                onClick={() => setVencimentos([])}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Limpar filtro
              </button>
            )}
          </div>

          {/* ============ SEÇÃO 1 — BOLETOS VENCIDOS ============ */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-foreground">Boletos Vencidos</h2>
              {data.ultimoImport.boletos && (
                <span className="text-xs text-muted-foreground">
                  Último import: {new Date(data.ultimoImport.boletos.importadoEm).toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                title="Total no filtro"
                value={data.boletos.total}
                subtitle={currency(data.boletos.valorTotal)}
                icon={Receipt}
                accent="bg-indigo-500/10 text-indigo-400"
              />
              <KpiCard
                title="Convertidos"
                value={data.boletos.convertidos}
                subtitle={`${data.boletos.taxaConversao.toFixed(1)}% de conversão`}
                icon={CheckCircle2}
                accent="bg-emerald-500/10 text-emerald-400"
              />
              <KpiCard
                title="Em aberto"
                value={data.boletos.emAberto}
                subtitle="bloqueados + aviso pend."
                icon={AlertCircle}
                accent="bg-amber-500/10 text-amber-400"
              />
              <KpiCard
                title="Inativos"
                value={data.boletos.inativos}
                subtitle="contratos encerrados"
                icon={CircleSlash}
                accent="bg-zinc-500/10 text-zinc-400"
              />
              <KpiCard
                title="Valor recuperado"
                value={currency(data.boletos.valorConvertidos)}
                subtitle="soma dos 'Em dia'"
                icon={Wallet}
                accent="bg-emerald-500/10 text-emerald-400"
              />
              <KpiCard
                title="Valor em risco"
                value={currency(data.boletos.valorEmAberto)}
                subtitle="bloqueados + aviso pend."
                icon={AlertTriangle}
                accent="bg-red-500/10 text-red-400"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DistribuicaoTabela
                title="Por status"
                keyLabel="Status"
                showValue
                rows={data.boletos.porStatus.map((r) => ({
                  label: r.status,
                  count: r.count,
                  valor: r.valor,
                  badgeClass: STATUS_BADGE_COLORS[r.status],
                }))}
              />
              <DistribuicaoTabela
                title="Por cidade"
                keyLabel="Cidade"
                showValue
                rows={data.boletos.porCidade.map((r) => ({
                  label: r.cidade,
                  count: r.count,
                  valor: r.valor,
                }))}
              />
              <DistribuicaoTabela
                title="Por data de vencimento"
                keyLabel="Vencimento"
                showValue
                rows={data.boletos.porVencimento.map((r) => ({
                  label: formatDateBR(r.data),
                  count: r.count,
                  valor: r.valor,
                }))}
              />
              <DistribuicaoTabela
                title="Por data de pagamento"
                keyLabel="Pagamento"
                rows={data.boletos.porDataPagamento.map((r) => ({
                  label: formatDateBR(r.data),
                  count: r.count,
                }))}
              />
              <DistribuicaoTabela
                title="Perfil de atraso"
                keyLabel="Perfil"
                rows={data.boletos.porPerfilAtraso.map((r) => ({
                  label: PERFIL_LABELS[r.perfil] ?? r.perfil,
                  count: r.count,
                }))}
              />
              <DistribuicaoTabela
                title="Motivo do atraso"
                keyLabel="Motivo"
                rows={data.boletos.porMotivo.map((r) => ({
                  label: r.motivo,
                  count: r.count,
                }))}
              />
            </div>
          </section>

          {/* ============ SEÇÃO 2 — PRÉ-INATIVAÇÃO ============ */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pré-Inativação</h2>
              {data.ultimoImport.preInativacao && (
                <span className="text-xs text-muted-foreground">
                  Último import:{' '}
                  {new Date(data.ultimoImport.preInativacao.importadoEm).toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total"
                value={data.preInativacao.total}
                icon={Receipt}
                accent="bg-indigo-500/10 text-indigo-400"
              />
              <KpiCard
                title="Convertidos"
                value={preStatusMap.get('convertido') ?? 0}
                subtitle={
                  data.preInativacao.total > 0
                    ? `${(((preStatusMap.get('convertido') ?? 0) / data.preInativacao.total) * 100).toFixed(1)}%`
                    : '0%'
                }
                icon={CheckCircle2}
                accent="bg-emerald-500/10 text-emerald-400"
              />
              <KpiCard
                title="Pendentes"
                value={preStatusMap.get('pendente') ?? 0}
                subtitle="sem abordagem"
                icon={AlertCircle}
                accent="bg-zinc-500/10 text-zinc-400"
              />
              <KpiCard
                title="Sem contato"
                value={preStatusMap.get('sem_contato') ?? 0}
                subtitle="caixa postal / bloqueado"
                icon={PhoneOff}
                accent="bg-orange-500/10 text-orange-400"
              />
              <KpiCard
                title="Retirada em aberto"
                value={preStatusMap.get('retirada_em_aberto') ?? 0}
                icon={Truck}
                accent="bg-amber-500/10 text-amber-400"
              />
              <KpiCard
                title="Retirada finalizada"
                value={preStatusMap.get('retirada_finalizada') ?? 0}
                icon={CheckCircle2}
                accent="bg-sky-500/10 text-sky-400"
              />
              <KpiCard
                title="Cancelamentos"
                value={preStatusMap.get('cancelamento_confirmado') ?? 0}
                subtitle="confirmados"
                icon={XCircle}
                accent="bg-red-500/10 text-red-400"
              />
              <KpiCard
                title="Promessas"
                value={
                  (preStatusMap.get('promessa_pagamento') ?? 0) +
                  (preStatusMap.get('promessa_devolucao') ?? 0)
                }
                subtitle={`pgto: ${preStatusMap.get('promessa_pagamento') ?? 0} · dev: ${preStatusMap.get('promessa_devolucao') ?? 0}`}
                icon={RotateCcw}
                accent="bg-purple-500/10 text-purple-400"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DistribuicaoTabela
                title="Por status CRM"
                keyLabel="Status"
                rows={data.preInativacao.porStatusCrm.map((r) => ({
                  label: STATUS_CRM_LABELS[r.status] ?? r.status,
                  count: r.count,
                }))}
              />
              <DistribuicaoTabela
                title="Por cidade"
                keyLabel="Cidade"
                rows={data.preInativacao.porCidade.map((r) => ({
                  label: r.cidade,
                  count: r.count,
                }))}
              />
            </div>
          </section>
        </>
      )}
    </PageLayout>
  );
}

export default function CobrancaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CobrancaPageContent />
    </Suspense>
  );
}
