'use client';

import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatContainer } from './chat-container';

export function DashielWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="pointer-events-auto mb-3 w-[min(92vw,460px)]">
          <div className="mb-[-1px] flex items-center justify-between rounded-t-[1.4rem] border border-border/70 bg-white px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
            <div className="text-base font-semibold text-foreground">Dashiel Virtual Assistant</div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ChatContainer
            variant="widget"
            className="rounded-t-none border-t-0 shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_16px_34px_rgba(255,79,34,0.38)] transition-transform duration-200 hover:scale-105',
          'bg-[radial-gradient(circle_at_30%_30%,#ff7858,#ff3b12_70%)]'
        )}
        aria-label={open ? 'Fechar Dashiel' : 'Abrir Dashiel'}
      >
        <Sparkles className="h-6 w-6" />
      </button>
    </div>
  );
}
