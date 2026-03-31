'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Star } from 'lucide-react';

export function Top5Ranking({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top 5 Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">Sem dados de ranking.</div>
        </CardContent>
      </Card>
    );
  }

  const top5 = ranking.slice(0, 5);

  const getMedalColor = (pos: number) => {
    switch (pos) {
      case 1:
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'; // Ouro
      case 2:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20'; // Prata
      case 3:
        return 'text-amber-600 bg-amber-600/10 border-amber-600/20'; // Bronze
      default:
        return 'text-primary bg-primary/10 border-primary/20'; // Outros
    }
  };

  const getIcon = (pos: number) => {
    if (pos === 1) return <Trophy className="h-5 w-5" />;
    if (pos <= 3) return <Medal className="h-5 w-5" />;
    return <Star className="h-4 w-4" />;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 5 Técnicos — Volume Concluído</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {top5.map((tech) => (
            <div
              key={tech.technicianId}
              className={`flex items-center justify-between p-3 rounded-lg border ${getMedalColor(tech.position)}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50 font-bold shadow-sm">
                  {tech.position}º
                </div>
                <div>
                  <div className="font-semibold">{tech.technicianName}</div>
                  <div className="flex items-center gap-2 text-xs opacity-80 mt-1">
                    <span>{tech.totalOS} Atendimentos</span>
                    <span>•</span>
                    <span>SLA Médio: {tech.avgSlaUtilFormatted}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                {getIcon(tech.position)}
                {tech.slaUtilPercent !== null && (
                  <Badge variant="outline" className="mt-2 text-[10px] bg-background">
                    {tech.slaUtilPercent}% Útil
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
