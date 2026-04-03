'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit } from 'lucide-react';
import { DashielQuickActions } from '@/components/ai/dashiel-quick-actions';
import type { DashielInitialView } from '@/lib/dashiel/types';

export function DashielEmptyState({
  initialView,
  onAction,
  disabled = false,
}: {
  initialView: DashielInitialView;
  onAction: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
            <BrainCircuit className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{initialView.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{initialView.description}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {initialView.insightCards.map((card) => (
            <div
              key={`${card.label}-${card.value}`}
              className="rounded-2xl border border-white/8 bg-black/20 p-3"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{card.label}</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-white">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Ações rápidas</p>
        <div className="mt-3">
          <DashielQuickActions actions={initialView.quickActions} onAction={onAction} disabled={disabled} />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Sugestões iniciais</p>
        <div className="mt-3 space-y-2">
          {initialView.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => onAction(suggestion)}
              className="flex w-full items-center justify-between rounded-2xl border border-transparent bg-black/10 px-3 py-3 text-left text-sm text-slate-200 transition hover:border-white/10 hover:bg-white/6 disabled:pointer-events-none disabled:opacity-60"
            >
              <span>{suggestion}</span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
