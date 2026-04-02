import { Loader2 } from 'lucide-react';

export function ChatLoading() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7858,#ff3b12_70%)] text-white shadow-[0_8px_18px_rgba(255,79,34,0.28)]">
          <span className="text-xs font-semibold">D</span>
        </div>
        <div className="max-w-[85%] rounded-[1.35rem] rounded-bl-sm bg-slate-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Digitando...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
