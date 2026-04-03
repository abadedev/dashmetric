'use client';

import { AnimatePresence } from 'framer-motion';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { DashielEmptyState } from '@/components/ai/dashiel-empty-state';
import { DashielLoading } from '@/components/ai/dashiel-loading';
import { DashielMessageBubble } from '@/components/ai/dashiel-message-bubble';
import type { DashielInitialView, DashielMessage } from '@/lib/dashiel/types';

export function DashielMessages({
  messages,
  isLoading,
  initialView,
  onAction,
}: {
  messages: DashielMessage[];
  isLoading: boolean;
  initialView: DashielInitialView;
  onAction: (prompt: string) => void;
}) {
  const [loadingStep, setLoadingStep] = useState(0);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useEffectEvent(() => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % 3);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <DashielEmptyState initialView={initialView} onAction={onAction} disabled={isLoading} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <DashielMessageBubble
                key={message.id}
                message={message}
                onSuggestionClick={onAction}
              />
            ))}
          </AnimatePresence>
        )}

        {isLoading ? <DashielLoading step={loadingStep} /> : null}
        <div ref={anchorRef} />
      </div>
    </div>
  );
}
