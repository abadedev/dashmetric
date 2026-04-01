'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, PencilRuler } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { GlobalDateFilter, parseAsLocalIsoDate } from '@/components/ui/global-date-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryState } from 'nuqs';
import { endOfMonth, startOfMonth } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, StateDisplay, TableSkeleton } from '@/components/ui/state-display';

function InfraestruturaPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['infrastructure-overview', qs],
    queryFn: async () => {
      const response = await fetch(`/api/infrastructure?${qs}`);
      return response.json();
    },
  });

  return (
    <PageLayout
      title="Infraestrutura"
      description="Módulo estrutural em branco, integrado ao menu dinâmico e pronto para receber dashboards futuros."
      actions={<GlobalDateFilter />}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Network className="h-5 w-5" />
              <CardTitle>Base preparada</CardTitle>
            </div>
            <CardDescription>
              A rota, o cadastro do módulo e a integração com a sidebar já existem. Esta área pode evoluir sem alterar a arquitetura principal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A API do módulo já existe e está pronta para começar a receber eventos, indicadores ou snapshots de infraestrutura no mesmo padrão de filtros por período.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <PencilRuler className="h-5 w-5" />
              <CardTitle>Editável</CardTitle>
            </div>
            <CardDescription>
              Este módulo foi pensado para nascer simples, vazio e pronto para ser configurado pelo painel administrativo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Últimos registros de infraestrutura</CardTitle>
            <CardDescription>
              Hoje o módulo nasce vazio, mas já conectado ao backend para futura ingestão de dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.length ? (
                  data.data.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title || 'Sem título'}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>{item.city || '-'}</TableCell>
                      <TableCell>
                        {item.referenceDate ? new Date(item.referenceDate).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 align-middle">
                      <StateDisplay variant="empty" title="Sem Infraestrutura" description="Nenhum registro importado até agora." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

export default function InfraestruturaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InfraestruturaPageContent />
    </Suspense>
  );
}
