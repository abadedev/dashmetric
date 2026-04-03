'use client';

import { Medal, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Top5Ranking({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top 5 Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">Sem dados de ranking.</div>
        </CardContent>
      </Card>
    );
  }

  const top5 = ranking.slice(0, 5);

  const getMedalColor = (pos: number) => {
    switch (pos) {
      case 1:
        return 'text-amber-600 bg-amber-500/12 border-amber-500/20 dark:text-amber-300';
      case 2:
        return 'text-muted-foreground bg-secondary border-border/80';
      case 3:
        return 'text-violet-600 bg-violet-500/10 border-violet-500/20 dark:text-violet-300';
      default:
        return 'text-primary bg-primary/10 border-primary/20';
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
        <CardTitle>Top 5 Técnicos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {top5.map((tech) => (
            <div
              key={tech.technicianId}
              className={`flex items-center justify-between rounded-2xl border p-3.5 ${getMedalColor(tech.position)}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 font-bold shadow-sm ring-1 ring-white/20">
                  {tech.position}º
                </div>
                <div>
                  <div className="font-semibold">{tech.technicianName}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
                    <span>{tech.totalOS} Atendimentos</span>
                    <span>•</span>
                    <span>SLA Médio: {tech.avgSlaUtilFormatted}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                {getIcon(tech.position)}
                {tech.slaUtilPercent !== null && (
                  <Badge variant="outline" className="mt-2 bg-background/80 text-[10px]">
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
