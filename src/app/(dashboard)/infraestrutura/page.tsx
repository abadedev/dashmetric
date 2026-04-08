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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function InfraestruturaPageContent() {
  const [from] = useQueryState("from", parseAsLocalIsoDate.withDefault(startOfMonth(new Date())));
  const [to] = useQueryState("to", parseAsLocalIsoDate.withDefault(endOfMonth(new Date())));

  const [city, setCity] = useQueryState("city");
  const [technician, setTechnician] = useQueryState("technician");

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (city && city !== 'all') queryParams.set('city', city);
  if (technician && technician !== 'all') queryParams.set('technician', technician);
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
      description="Painel analítico das manutenções, ocorrências e reparos de infraestrutura."
      actions={
        <>
          <Select value={technician || 'all'} onValueChange={(value) => setTechnician(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar técnico" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {(data?.technicians || []).map((item: string) => (
                <SelectItem key={item} value={item} className="capitalize">
                  {item.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city || 'all'} onValueChange={(value) => setCity(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar cidade" />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {(data?.cities || []).map((item: string) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GlobalDateFilter />
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenções Registradas</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
            <p className="text-xs text-muted-foreground">tickets no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cidades Afetadas</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.byCity?.length || 0}</div>
            <p className="text-xs text-muted-foreground">cidades com ocorrências registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Serviço</CardTitle>
            <PencilRuler className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.byCategory?.length || 0}</div>
            <p className="text-xs text-muted-foreground">categorias distintas demandadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr] mt-4">
        {/* Gráfico 1: Volume por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências por Serviço/Problema</CardTitle>
            <CardDescription>
              Volume de atividades agrupadas pela categoria do serviço.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.byCategory?.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                {data.byCategory.map((cat: any) => (
                  <div key={cat.category} className="flex items-center">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full">
                        <p className="text-sm font-medium leading-none">{cat.category || 'Desconhecida'}</p>
                        <div className="font-medium">{cat.total}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Volume por Cidade */}
        <Card>
          <CardHeader>
            <CardTitle>Cidades mais afetadas</CardTitle>
            <CardDescription>
              Locais com maior volume de infraestrutura no período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.byCity?.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                {data.byCity.map((city: any) => (
                  <div key={city.city} className="flex items-center">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full">
                        <p className="text-sm font-medium leading-none">{city.city || 'Desconhecida'}</p>
                        <div className="font-medium">{city.total}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Últimos Registros Consolidados</CardTitle>
            <CardDescription>
              Detalhamento das ocorrências, caixas e técnicos responsáveis (Limitado a 100).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>CA/Equipamento</TableHead>
                  <TableHead>Problema/Serviço</TableHead>
                  <TableHead>Técnico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.length ? (
                  data.data.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {item.referenceDate
                          ? new Date(item.referenceDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : '-'}
                      </TableCell>
                      <TableCell>{item.city || '-'}</TableCell>
                      <TableCell>{item.payload?.caequip || item.payload?.['ca/equip'] || item.payload?.equip || item.payload?.ca_equip || '-'}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="capitalize">{item.payload?.tecnico || item.payload?.técnico || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground align-middle">
                      Nenhuma ocorrência importada no período.
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
