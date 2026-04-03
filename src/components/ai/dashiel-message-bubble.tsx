'use client';

import { motion } from 'framer-motion';
import { Sparkles, User2 } from 'lucide-react';
import type { DashielMessage } from '@/lib/dashiel/types';
import { cn } from '@/lib/utils';

function parseBlocks(content: string) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
  const paragraphs = content
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !block.split('\n').every((line) => line.trim().startsWith('- ')));

  return { bulletLines, paragraphs };
}

export function DashielMessageBubble({
  message,
  onSuggestionClick,
}: {
  message: DashielMessage;
  onSuggestionClick: (prompt: string) => void;
}) {
  const isAssistant = message.role === 'assistant';
  const timestamp = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const { bulletLines, paragraphs } = parseBlocks(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', !isAssistant && 'justify-end')}
    >
      {isAssistant ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-100 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <Sparkles className="h-4 w-4" />
        </div>
      ) : null}

      <div className={cn('max-w-[88%] space-y-3', !isAssistant && 'flex flex-col items-end')}>
        <div
          className={cn(
            'overflow-hidden rounded-[24px] border px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]',
            isAssistant
              ? 'rounded-tl-md border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-slate-100'
              : 'rounded-tr-md border-cyan-400/20 bg-cyan-400/12 text-cyan-50'
          )}
        >
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {isAssistant ? <Sparkles className="h-3 w-3" /> : <User2 className="h-3 w-3" />}
            <span>{isAssistant ? 'Dashiel' : 'Você'}</span>
            <span className="text-slate-500">{timestamp}</span>
          </div>

          <div className="space-y-3 text-sm leading-6">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {bulletLines.length > 0 ? (
              <ul className="space-y-2 rounded-2xl border border-white/8 bg-black/10 p-3 text-slate-200">
                {bulletLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {isAssistant && message.insightCards && message.insightCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {message.insightCards.map((card) => (
              <div
                key={`${card.label}-${card.value}`}
                className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                <div className="mt-1 text-base font-semibold tracking-tight text-white">{card.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {isAssistant && message.suggestions && message.suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick(suggestion)}
                className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
