'use client';

import { SendHorizonal } from 'lucide-react';
import { type KeyboardEvent, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="sticky bottom-0 z-10 mt-auto border-t border-border/70 bg-white px-4 py-4">
      <div className="mx-auto flex w-full max-w-4xl items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre os dados da operação..."
          rows={1}
          className={cn(
            'max-h-36 min-h-12 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-slate-400',
            disabled && 'cursor-not-allowed opacity-70'
          )}
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          size="icon"
          className="h-10 w-10 rounded-full bg-transparent text-slate-400 shadow-none hover:bg-slate-100 hover:text-slate-700 disabled:bg-transparent"
          aria-label="Enviar mensagem"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
