'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Star } from 'lucide-react';

export function Top5Cards({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length === 0) return null;

  const top5 = ranking.slice(0, 5);

  const getStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return {
          border: 'border-yellow-500/50 shadow-yellow-500/20',
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-600 dark:text-yellow-500',
          icon: <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
        };
      case 2:
        return {
          border: 'border-slate-400/50 shadow-slate-400/20',
          bg: 'bg-slate-400/10',
          text: 'text-slate-600 dark:text-slate-400',
          icon: <Medal className="h-6 w-6 text-slate-600 dark:text-slate-400" />
        };
      case 3:
        return {
          border: 'border-amber-600/50 shadow-amber-600/20',
          bg: 'bg-amber-600/10',
          text: 'text-amber-700 dark:text-amber-600',
          icon: <Medal className="h-6 w-6 text-amber-700 dark:text-amber-600" />
        };
      default:
        return {
          border: 'border-primary/30',
          bg: 'bg-primary/5',
          text: 'text-primary',
          icon: <Star className="h-6 w-6 text-primary" />
        };
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {top5.map((tech) => {
        const style = getStyle(tech.position);
        return (
          <Card key={tech.technicianId} className={`relative overflow-hidden border-2 ${style.border}`}>
            <div className={`absolute top-0 right-0 p-4 rounded-bl-3xl ${style.bg}`}>
              {style.icon}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span className={`text-2xl ${style.text}`}>{tech.position}º</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold truncate mb-1" title={tech.technicianName}>
                {tech.technicianName}
              </div>
              <div className="text-2xl font-black mb-2">{tech.totalOS} <span className="text-sm font-normal text-muted-foreground">OS</span></div>
              
              <div className="space-y-1 mt-4 border-t pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA Útil %</span>
                  <span className="font-medium">{tech.slaUtilPercent ?? '-'}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SLA Médio</span>
                  <span className="font-mono">{tech.avgSlaUtilFormatted}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
