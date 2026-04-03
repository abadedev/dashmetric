'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DashielComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <div className="border-t border-white/8 p-4">
      <div className="rounded-[26px] border border-white/10 bg-black/20 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            disabled={disabled}
            rows={1}
            placeholder="Pergunte sobre SLA, técnicos, atendimentos ou tendências da operação..."
            className={cn(
              'max-h-[180px] min-h-[52px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500',
              disabled && 'cursor-not-allowed opacity-70'
            )}
          />

          <Button
            type="button"
            size="icon-lg"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="h-11 w-11 rounded-2xl bg-white text-slate-950 hover:bg-slate-200"
          >
            {disabled ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <ArrowUp className="h-4.5 w-4.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
