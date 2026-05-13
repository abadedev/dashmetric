'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { SupportTable } from '@/components/suporte/support-table';
import { SupportChart } from '@/components/suporte/support-chart';
import {
  SupportDetailedTable,
  type LinhaDetalhada,
  type TotaisDetalhados,
} from '@/components/suporte/support-detailed-table';
import { PageSkeleton, TableSkeleton, StateDisplay } from '@/components/ui/state-display';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';

type RespostaDetalhada = {
  fonte: 'detalhado';
  linhas: LinhaDetalhada[];
  totais: TotaisDetalhados;
};

type RespostaLegado = {
  fonte: 'legado';
  dadosLegado: {
    summary: Array<{ tipo: string; quantidade: number; percentual: number }>;
    total: number;
    triageByAttendant: Array<{
      attendantName: string;
      openedManutExt: number;
      withoutManut: number;
      total: number;
      sharePercent: number;
    }>;
  };
};

type Resposta = RespostaDetalhada | RespostaLegado;

function pickPeriod(from?: Date | null, to?: Date | null) {
  // Mês/ano de referência = mês da data "from" (ou do "to" se from ausente, senão mês corrente).
  const ref = from ?? to ?? new Date();
  return { mes: ref.getMonth() + 1, ano: ref.getFullYear() };
}

function SuportePageContent() {
  const [from] = useQueryState('from', parseAsLocalIsoDate);
  const [to] = useQueryState('to', parseAsLocalIsoDate);

  const { mes, ano } = pickPeriod(from, to);

  const qs = new URLSearchParams({ mes: String(mes), ano: String(ano) }).toString();

  const { data, isLoading, isError, refetch } = useQuery<Resposta>({
    queryKey: ['suporte-call-records', mes, ano],
    queryFn: async () => {
      const res = await fetch(`/api/suporte/call-records?${qs}`);
      if (!res.ok) throw new Error('Falha ao carregar suporte.');
      return res.json();
    },
  });

  return (
    <PageLayout
      title="Suporte Técnico"
      description="Resumo dos atendimentos de suporte por telefone — classificação por segmento (Comercial, Financeiro, Técnico) ou agregação histórica."
      actions={<GlobalDateFilter />}
    >
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <StateDisplay
          variant="error"
          title="Não foi possível carregar o resumo"
          description="Tivemos um problema ao consultar o consolidado de suporte."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : data?.fonte === 'detalhado' ? (
        <SupportDetailedTable linhas={data.linhas} totais={data.totais} />
      ) : data?.fonte === 'legado' ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Dados históricos — visualização agregada</p>
              <p className="text-xs text-amber-300/80">
                Não há atendimentos detalhados (1 linha por OS) para o período selecionado.
                Mostrando agregação legada por categoria.
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <SupportTable
              summary={data.dadosLegado.summary}
              total={data.dadosLegado.total}
              from={from}
              to={to}
            />
            <SupportChart records={data.dadosLegado.triageByAttendant} />
          </div>
        </div>
      ) : (
        <StateDisplay
          variant="empty"
          title="Sem dados"
          description="Nenhuma fonte de dados disponível para o período selecionado."
        />
      )}
    </PageLayout>
  );
}

export default function SuportePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SuportePageContent />
    </Suspense>
  );
}
