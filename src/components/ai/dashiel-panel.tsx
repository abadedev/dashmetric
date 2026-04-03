'use client';

import { RotateCcw } from 'lucide-react';
import { DashielComposer } from '@/components/ai/dashiel-composer';
import { DashielHeader } from '@/components/ai/dashiel-header';
import { DashielMessages } from '@/components/ai/dashiel-messages';
import { Button } from '@/components/ui/button';
import { buildDashielInitialView } from '@/lib/dashiel/mock-context';
import type { DashielScreenContext } from '@/lib/dashiel/types';
import { useDashielChat } from '@/hooks/use-dashiel-chat';

function buildSubtitle(context?: DashielScreenContext | null) {
  if (context?.periodLabel && context?.summary?.topCategory) {
    return `${context.summary.topCategory} em foco no período ${context.periodLabel}`;
  }

  if (context?.chartTitle) {
    return `Analisando dados em tempo real de ${context.chartTitle}`;
  }

  return 'Assistente virtual da operação';
}

export function DashielPanel({
  context,
  onClose,
  compact = false,
}: {
  context?: DashielScreenContext | null;
  onClose: () => void;
  compact?: boolean;
}) {
  const initialView = buildDashielInitialView(context || undefined);
  const { messages, input, setInput, isLoading, error, submitMessage, runQuickAction, clearChat } =
    useDashielChat({
      context: context || undefined,
    });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] text-white shadow-[0_28px_120px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
      <DashielHeader subtitle={buildSubtitle(context)} onClose={onClose} compact={compact} />

      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 text-xs text-slate-400">
        <p>
          Dashiel lê contexto do dashboard e devolve análises objetivas sobre operação, SLA e performance.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="rounded-full text-slate-300 hover:bg-white/8 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar
        </Button>
      </div>

      <DashielMessages
        messages={messages}
        isLoading={isLoading}
        initialView={initialView}
        onAction={runQuickAction}
      />

      {error ? (
        <div className="px-4 pb-2">
          <div className="rounded-2xl border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        </div>
      ) : null}

      <DashielComposer
        value={input}
        onChange={setInput}
        onSubmit={() => submitMessage(input)}
        disabled={isLoading}
      />
    </div>
  );
}
