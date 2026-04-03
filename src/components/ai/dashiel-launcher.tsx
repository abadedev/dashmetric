'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { DashielPanel } from '@/components/ai/dashiel-panel';
import { useDashielScreenContext } from '@/components/ai/dashiel-provider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getInsightBadgeCount } from '@/lib/dashiel/mock-context';
import { cn } from '@/lib/utils';

export function DashielLauncher() {
  const [open, setOpen] = useState(false);
  const { context } = useDashielScreenContext();
  const badgeCount = getInsightBadgeCount(context || undefined);

  return (
    <>
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 md:bottom-6 md:right-6">
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pointer-events-auto hidden h-[min(76vh,780px)] w-[min(92vw,460px)] md:block"
            >
              <DashielPanel context={context} onClose={() => setOpen(false)} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-auto mt-4 flex justify-end">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? 'Fechar Dashiel' : 'Abrir Dashiel'}
              className={cn(
                'relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_rgba(255,255,255,0.08)_45%,_rgba(2,6,23,0.96)_100%)] text-white shadow-[0_22px_48px_rgba(0,0,0,0.38),0_0_40px_rgba(56,189,248,0.18)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_28px_56px_rgba(0,0,0,0.42),0_0_48px_rgba(56,189,248,0.24)]'
              )}
            >
              <div className="absolute inset-1 rounded-full border border-white/10" />
              <motion.div
                initial={false}
                animate={{ rotate: open ? 180 : 0, scale: open ? 0.96 : 1 }}
                transition={{ duration: 0.22 }}
                className="relative"
              >
                {open ? <Bot className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
              </motion.div>

              {!open && badgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-950/60 bg-cyan-400 px-1 text-[11px] font-semibold text-slate-950">
                  {badgeCount}
                </span>
              ) : null}
            </button>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 hidden -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/92 px-3 py-2 text-right shadow-lg md:block md:group-hover:block"
            >
              <div className="text-sm font-medium text-white">Dashiel IA</div>
              <div className="text-xs text-slate-400">Assistente operacional</div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-[92vh] rounded-t-[32px] border-white/10 bg-transparent p-3 shadow-none"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Dashiel</SheetTitle>
              <SheetDescription>Assistente operacional do dashboard</SheetDescription>
            </SheetHeader>
            <DashielPanel context={context} onClose={() => setOpen(false)} compact />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
