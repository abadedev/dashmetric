import { Sparkles } from 'lucide-react';

export function ChatLoading() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-sm ring-1 ring-border/50">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
