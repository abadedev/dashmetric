'use client';

import { SendHorizonal } from 'lucide-react';
import { type KeyboardEvent, useDeferredValue } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const deferredValue = useDeferredValue(value);
  const canSend = deferredValue.trim().length > 0 && !disabled;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSubmit();
      }
    }
  }

  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-border/50 bg-card px-3 py-3">
      <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-border focus-within:shadow-md">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre os dados da operação..."
          rows={1}
          className={cn(
            'max-h-32 min-h-10 flex-1 resize-none bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/60',
            disabled && 'cursor-not-allowed opacity-60'
          )}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Enviar mensagem"
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
            canSend
              ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
              : 'cursor-not-allowed text-muted-foreground/40'
          )}
        >
          <SendHorizonal className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground/50">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
