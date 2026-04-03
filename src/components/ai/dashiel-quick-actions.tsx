'use client';

import { Activity, Gauge, Headset, Sparkles, TriangleAlert, Trophy, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashielQuickAction } from '@/lib/dashiel/types';

const ICONS = {
  activity: Activity,
  gauge: Gauge,
  headset: Headset,
  sparkles: Sparkles,
  'triangle-alert': TriangleAlert,
  trophy: Trophy,
  wrench: Wrench,
};

export function DashielQuickActions({
  actions,
  onAction,
  disabled = false,
}: {
  actions: DashielQuickAction[];
  onAction: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon ? ICONS[action.icon as keyof typeof ICONS] : Sparkles;

        return (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction(action.prompt)}
            className="h-auto rounded-full border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-200 hover:border-white/20 hover:bg-white/10"
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
