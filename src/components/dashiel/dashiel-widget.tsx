'use client';

import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatContainer } from './chat-container';

export function DashielWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div className="pointer-events-auto flex w-[min(92vw,420px)] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/15">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-primary-foreground">Dashiel</p>
                <p className="mt-0.5 text-xs text-primary-foreground/60">Assistente virtual da operação</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground/60 transition-colors hover:bg-white/15 hover:text-primary-foreground"
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ChatContainer variant="widget" />
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:opacity-90',
          open && 'scale-95 opacity-90'
        )}
        aria-label={open ? 'Fechar Dashiel' : 'Abrir Dashiel'}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </div>
  );
}
