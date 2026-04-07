'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils/format';

const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  IQIv: 'Instalação com Reparo < 30 dias',
  IQRv: 'Reparo Reincidente < 30 dias',
  RTV: 'Reclamação Varejo',
  RST: 'Reclamação Serviço Técnico',
  ICT: 'Inviabilidade Técnica',
  Retorno: 'Retorno Geral',
};

export function QualitySummary({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Resumo de Qualidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">Sem dados de qualidade.</div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar por total descrescente
  const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Indicadores de Qualidade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((ind) => (
            <div
              key={ind.indicator}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/45 p-3.5"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{ind.indicator}</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {INDICATOR_DESCRIPTIONS[ind.indicator] || ind.indicator}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  {formatNumber(ind.total)}
                </span>
                <Badge variant="secondary">Registros</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
