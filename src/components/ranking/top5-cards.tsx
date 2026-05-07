'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Star } from 'lucide-react';

export function Top5Cards({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length === 0) return null;

  const top5 = ranking.slice(0, 5);

  const getStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return {
          border: 'border-border/80',
          accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
          text: 'text-foreground',
          icon: <Trophy className="h-6 w-6 text-amber-700 dark:text-amber-300" />,
        };
      case 2:
        return {
          border: 'border-border/75',
          accent: 'bg-slate-400/10 text-slate-700 dark:text-slate-300',
          text: 'text-foreground',
          icon: <Medal className="h-6 w-6 text-slate-700 dark:text-slate-300" />,
        };
      case 3:
        return {
          border: 'border-border/75',
          accent: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
          text: 'text-foreground',
          icon: <Medal className="h-6 w-6 text-orange-700 dark:text-orange-300" />,
        };
      default:
        return {
          border: 'border-border/70',
          accent: 'bg-foreground/[0.05] text-muted-foreground',
          text: 'text-foreground',
          icon: <Star className="h-6 w-6 text-muted-foreground" />,
        };
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {top5.map((tech) => {
        const style = getStyle(tech.position);
        return (
          <Card
            key={tech.technicianId}
            className={`relative overflow-hidden border ${style.border} bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),var(--card))] shadow-[0_16px_36px_-30px_rgba(15,23,42,0.28)]`}
          >
            <div className={`absolute right-4 top-4 rounded-2xl p-3 ${style.accent}`}>
              {style.icon}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <span className={`text-2xl ${style.text}`}>{tech.position}o</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-1 truncate text-lg font-semibold tracking-tight" title={tech.technicianName}>
                {tech.technicianName}
              </div>
              <div className="mb-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                {tech.totalOS} <span className="text-sm font-normal text-muted-foreground">OS</span>
              </div>

              <div className="mt-4 space-y-1 border-t border-border/70 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA %</span>
                  <span className="font-medium text-foreground">{tech.slaPercent ?? '-'}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA medio</span>
                  <span className="font-mono text-foreground">{tech.avgSlaFormatted ?? tech.avgSlaUtilFormatted}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA Útil (informativo)</span>
                  <span className="font-medium text-foreground">{tech.slaUtilPercent ?? '-'}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
