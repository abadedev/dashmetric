'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';
import { useState } from 'react';
import { TechDetailDialog } from '@/components/ranking/tech-detail-dialog';

export function RankingTable({ ranking }: { ranking: any[] }) {
  const [selectedTech, setSelectedTech] = useState<any | null>(null);

  if (!ranking || ranking.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Sem dados para exibir na tabela geral.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Listagem Geral - Desempenho por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">Pos</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Total OS</TableHead>
                  <TableHead className="text-right">Inst. Nova</TableHead>
                  <TableHead className="text-right">Inst. Reat</TableHead>
                  <TableHead className="text-right">Reparo</TableHead>
                  <TableHead className="text-right">Mud. End.</TableHead>
                  <TableHead className="text-right">Mud. Pl.</TableHead>
                  <TableHead className="text-right">Ret. Kit</TableHead>
                  <TableHead className="text-right">Retorno</TableHead>
                  <TableHead className="text-right">SLA %</TableHead>
                  <TableHead className="text-right">SLA Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((tech) => (
                  <TableRow
                    key={tech.technicianId}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTech(tech)}
                  >
                    <TableCell className="font-bold text-center border-r">
                      {tech.position}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {tech.technicianName}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {tech.totalOS}
                    </TableCell>
                    <TableCell className="text-right">{tech.instNova || '-'}</TableCell>
                    <TableCell className="text-right">{tech.instReativacao || '-'}</TableCell>
                    <TableCell className="text-right">{tech.reparo || '-'}</TableCell>
                    <TableCell className="text-right">{tech.mudancaEndereco || '-'}</TableCell>
                    <TableCell className="text-right">{tech.mudancaPlano || '-'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{tech.retiradaKit || '-'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{tech.retorno || '-'}</TableCell>
                    <TableCell className="text-right">
                      {tech.slaUtilPercent !== null ? (
                        <Badge
                          variant={tech.slaUtilPercent >= 95 ? 'default' : 'destructive'}
                          className={tech.slaUtilPercent >= 95 ? 'bg-green-600' : ''}
                        >
                          {tech.slaUtilPercent}%
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {tech.avgSlaUtilFormatted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TechDetailDialog
        tech={selectedTech}
        isOpen={!!selectedTech}
        onClose={() => setSelectedTech(null)}
      />
    </>
  );
}
