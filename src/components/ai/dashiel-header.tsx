'use client';

import { motion } from 'framer-motion';
import { Activity, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DashielHeader({
  subtitle,
  onClose,
  compact = false,
}: {
  subtitle: string;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] px-5 pb-4 pt-5',
        compact && 'px-4 pb-3 pt-4'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <motion.div
            initial={{ scale: 0.92, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_32px_rgba(0,0,0,0.28)]"
          >
            <div className="absolute inset-1 rounded-[1rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
            <Sparkles className="relative h-5 w-5 text-white" />
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-white">Dashiel</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                <Activity className="h-3 w-3" />
                Online agora
              </span>
            </div>
            <p className="mt-1 max-w-[18rem] text-sm leading-5 text-slate-300">{subtitle}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fechar Dashiel"
          className="rounded-full border border-white/8 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
