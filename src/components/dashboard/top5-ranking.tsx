'use client';

import { Medal, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Top5Ranking({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top 5 Tecnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">Sem dados de ranking.</div>
        </CardContent>
      </Card>
    );
  }

  const top5 = ranking.slice(0, 5);

  const getMedalStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return 'border-border/80 bg-card/92 text-foreground';
      case 2:
        return 'border-border/75 bg-card/80 text-foreground';
      case 3:
        return 'border-border/75 bg-card/76 text-foreground';
      default:
        return 'border-border/70 bg-background/72 text-foreground';
    }
  };

  const getBadgeStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 2:
        return 'border-slate-400/20 bg-slate-400/10 text-slate-700 dark:text-slate-300';
      case 3:
        return 'border-orange-500/15 bg-orange-500/10 text-orange-700 dark:text-orange-300';
      default:
        return 'border-border/80 bg-background/80 text-muted-foreground';
    }
  };

  const getIcon = (pos: number) => {
    if (pos === 1) return <Trophy className="h-5 w-5" />;
    if (pos <= 3) return <Medal className="h-5 w-5" />;
    return <Star className="h-4 w-4" />;
  };

  return (
    <Card className="h-full border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]">
      <CardHeader>
        <CardTitle>Top 5 Tecnicos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {top5.map((tech) => (
            <div
              key={tech.technicianId}
              className={`flex items-center justify-between rounded-2xl border p-3.5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.28)] ${getMedalStyle(tech.position)}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/88 font-semibold text-foreground shadow-sm">
                  {tech.position}o
                </div>
                <div>
                  <div className="font-semibold tracking-tight">{tech.technicianName}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tech.totalOS} atendimentos</span>
                    <span>•</span>
                    <span>SLA medio: {tech.avgSlaUtilFormatted}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end text-muted-foreground">
                {getIcon(tech.position)}
                {tech.slaUtilPercent !== null && (
                  <Badge variant="outline" className={`mt-2 text-[10px] ${getBadgeStyle(tech.position)}`}>
                    {tech.slaUtilPercent}% util
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
