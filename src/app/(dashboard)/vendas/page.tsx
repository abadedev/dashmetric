'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter } from '@/components/ui/global-date-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { useQueryState } from 'nuqs';
import { endOfMonth, startOfMonth } from 'date-fns';
import { SalesKpiCards } from '@/components/vendas/sales-kpi-cards';
import { SalesDistributionChart } from '@/components/vendas/sales-distribution-chart';
import { SalesTopCities } from '@/components/vendas/sales-top-cities';
import { SalesSourceTable } from '@/components/vendas/sales-source-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VendasPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['sales-overview', qs],
    queryFn: async () => {
      const response = await fetch(`/api/sales?${qs}`);
      return response.json();
    },
  });

  return (
    <PageLayout
      title="Vendas"
      description="Indicadores comerciais integrados à mesma arquitetura do sistema, com funil consolidado por período."
      actions={<GlobalDateFilter />}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          <SalesKpiCards totals={data?.totals} />

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <SalesDistributionChart data={data?.byType || []} />
            <SalesTopCities data={data?.byCity || []} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <SalesSourceTable data={data?.bySource || []} />

            <Card>
              <CardHeader>
                <CardTitle>Leitura do módulo</CardTitle>
                <CardDescription>
                  O módulo consolida contratos, instalações e cancelamentos comerciais usando o mesmo fluxo de upload já existente no sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Importações de contratações geram base de negociados e fechados. Quando a indicação aponta marketing digital, o lead também entra automaticamente no KPI de captação.
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default function VendasPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-96 w-full" /></div>}>
      <VendasPageContent />
    </Suspense>
  );
}
