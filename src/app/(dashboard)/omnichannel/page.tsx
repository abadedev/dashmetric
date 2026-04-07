'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSkeleton } from '@/components/ui/state-display';
import { StateDisplay } from '@/components/ui/state-display';
import { OmnichannelSummaryCards } from '@/components/omnichannel/omnichannel-cards';
import { OmnichannelQuantidadeChart, OmnichannelTmaChart, OmnichannelTmiaChart } from '@/components/omnichannel/omnichannel-charts';
import { OmnichannelTable } from '@/components/omnichannel/omnichannel-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MONTH_LABELS: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function OmnichannelPageContent() {
  const [month, setMonth] = useState('');
  const [year, setYear]   = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (year)  params.set('year', year);
  const qs = params.toString();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['omnichannel', qs],
    queryFn: async () => {
      const res = await fetch(`/api/omnichannel${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Falha ao carregar dados do Omnichannel.');
      return res.json();
    },
  });

  const periods: { month: number; year: number }[] = data?.periods ?? [];
  const years   = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const months  = periods
    .filter((p) => !year || p.year === parseInt(year))
    .map((p) => p.month)
    .sort((a, b) => a - b);

  const allRecords = [...(data?.records ?? []), ...(data?.bots ?? [])]
    .sort((a, b) => (b.quantidade ?? 0) - (a.quantidade ?? 0));

  const toSecs = (t: string | null) => {
    if (!t) return 0;
    const p = t.split(':').map(Number);
    return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
  };

  const filteredAllRecords = searchTerm
    ? allRecords.filter((r) => normalize(r.agente ?? '').includes(normalize(searchTerm)))
    : allRecords;

  const filteredChartRecords = searchTerm
    ? (data?.records ?? []).filter((r: { agente: string }) =>
        normalize(r.agente ?? '').includes(normalize(searchTerm)))
    : (data?.records ?? []);

  const humanFiltered = filteredAllRecords.filter((r) => r.isHuman);
  const filteredTotalAtendentes = searchTerm ? humanFiltered.length : (data?.totalAtendentes ?? 0);
  const filteredTotalAtendimentos = searchTerm
    ? filteredAllRecords.reduce((s: number, r: { quantidade: number | null }) => s + (r.quantidade ?? 0), 0)
    : (data?.totalAtendimentos ?? 0);
  const filteredMelhorTma = searchTerm
    ? (humanFiltered.filter((r) => r.tma).sort((a, b) => toSecs(a.tma) - toSecs(b.tma))[0] ?? null)
    : (data?.melhorTma ?? null);
  const filteredPiorTma = searchTerm
    ? (humanFiltered.filter((r) => r.tma).sort((a, b) => toSecs(b.tma) - toSecs(a.tma))[0] ?? null)
    : (data?.piorTma ?? null);
  const filteredMelhorTme = searchTerm
    ? (humanFiltered.filter((r) => r.tme).sort((a, b) => toSecs(a.tme) - toSecs(b.tme))[0] ?? null)
    : (data?.melhorTme ?? null);
  const filteredPiorTme = searchTerm
    ? (humanFiltered.filter((r) => r.tme).sort((a, b) => toSecs(b.tme) - toSecs(a.tme))[0] ?? null)
    : (data?.piorTme ?? null);

  return (
    <PageLayout
      title="Omnichannel"
      description="Métricas de atendimento Matrix Go por agente — quantidade, TMA, TME e tempos operacionais."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[180px]"
          />

          <Select value={year || 'all'} onValueChange={(v: string | null) => { setYear((v ?? '') === 'all' ? '' : (v ?? '')); setMonth(''); }}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month || 'all'} onValueChange={(v: string | null) => setMonth((v ?? '') === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>{MONTH_LABELS[m] ?? m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <StateDisplay
          variant="error"
          title="Erro ao carregar dados"
          description="Não foi possível buscar os dados do Omnichannel."
          action={<Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}
        />
      ) : (
        <>
          <OmnichannelSummaryCards
            totalAtendentes={filteredTotalAtendentes}
            totalAtendimentos={filteredTotalAtendimentos}
            melhorTma={filteredMelhorTma}
            piorTma={filteredPiorTma}
            melhorTme={filteredMelhorTme}
            piorTme={filteredPiorTme}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <OmnichannelQuantidadeChart records={filteredChartRecords} />
            <OmnichannelTmaChart records={filteredChartRecords} />
          </div>

          <OmnichannelTmiaChart records={filteredChartRecords} />

          <OmnichannelTable records={filteredAllRecords} />
        </>
      )}
    </PageLayout>
  );
}

export default function OmnichannelPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OmnichannelPageContent />
    </Suspense>
  );
}
