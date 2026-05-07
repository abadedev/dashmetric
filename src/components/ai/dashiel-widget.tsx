'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, LoaderCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightCard = {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warning';
};

type MessageKind = 'default' | 'error' | 'empty';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  kind?: MessageKind;
};

// ─── Session ──────────────────────────────────────────────────────────────────

function getSessionId(): string {
  let id = localStorage.getItem('dashiel_session_id');
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('dashiel_session_id', id);
  }
  return id;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STARTER_MESSAGE =
  'Olá! Eu sou o assistente do sistema. Posso te ajudar com atendimentos, SLA, vendas e ranking técnico.';

const QUICK_PROMPTS = [
  'Como estamos hoje?',
  'Resumo geral',
  'Ranking dos técnicos',
  'SLA do período',
  'Cancelamentos',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMessage(role: Message['role'], content: string, kind?: MessageKind): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    kind,
  };
}

function classifyAssistantMessage(content: string): MessageKind {
  const n = content.toLowerCase();
  if (
    n.includes('sem dados') ||
    n.includes('nenhum dado') ||
    n.includes('não encontrei') ||
    n.includes('nao encontrei') ||
    n.includes('nenhum registro')
  ) {
    return 'empty';
  }
  return 'default';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatHeader({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 shadow-lg">
          <img src="/favicon.ico" alt="Dashiel" className="h-7 w-7 object-contain" />
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">Dashiel</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                loading ? 'animate-pulse bg-amber-400' : 'bg-emerald-400',
              )}
            />
            {loading ? 'Em análise…' : 'Ativo agora'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label="Fechar chat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isError = message.kind === 'error';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground shadow-lg shadow-primary/10'
            : isError
              ? 'rounded-bl-md border border-destructive/20 bg-destructive/10 text-destructive'
              : 'rounded-bl-md border border-border bg-card text-card-foreground',
        )}
      >
        {isError && (
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Erro ao consultar
          </span>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Analisando os dados</span>
          <span className="flex gap-1">
            {[0, 180, 360].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Sugestões rápidas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="rounded-xl border border-border bg-muted px-3 py-2.5 text-left text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightStrip({ cards }: { cards: InsightCard[] }) {
  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <div
          key={`${card.label}-${card.value}`}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {card.label}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function DashielWidget({ workspaceSlug }: { workspaceSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    buildMessage('assistant', STARTER_MESSAGE, 'default'),
  ]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = input.trim().length > 0 && !loading;
  const hasUserMessages = messages.some((m) => m.role === 'user');

  // Auto-scroll on new messages
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, buildMessage('user', trimmed)]);

    try {
      console.log('[dashiel-widget] workspaceSlug prop:', workspaceSlug);

      if (!workspaceSlug) {
        throw new Error('workspaceSlug ausente — não foi possível identificar o workspace.');
      }

      const payload = { chatInput: trimmed, sessionId: getSessionId(), workspaceSlug };
      console.log('[dashiel-widget] enviando:', payload);

      const response = await fetch('/api/dashiel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        output?: unknown;
        answer?: unknown;
        insightCards?: InsightCard[];
        error?: string;
      };

      const rawAnswer = data.output ?? data.answer;

      if (!response.ok || !rawAnswer) {
        throw new Error(data.error ?? 'Não foi possível consultar os dados no momento.');
      }

      let answer: string;
      if (typeof rawAnswer === 'string') {
        answer = rawAnswer.trim();
      } else if (
        rawAnswer &&
        typeof rawAnswer === 'object' &&
        'output' in rawAnswer &&
        typeof (rawAnswer as Record<string, unknown>).output === 'string'
      ) {
        answer = ((rawAnswer as Record<string, unknown>).output as string).trim();
      } else {
        answer = JSON.stringify(rawAnswer);
      }

      // Remove prefixo técnico do n8n se vier na resposta
      answer = answer
        .replace(/^\[Used tools:[\s\S]*?\]\s*/i, '')
        .replace(/^Tool:[\s\S]*?Result:[\s\S]*?\]\s*/i, '')
        .trim();

      setMessages((prev) => [
        ...prev,
        buildMessage('assistant', answer, classifyAssistantMessage(answer)),
      ]);
      setInsightCards(data.insightCards ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível consultar os dados agora.';
      setMessages((prev) => [...prev, buildMessage('assistant', msg, 'error')]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-0 z-50 flex flex-col items-end gap-4 p-4 md:p-6">
      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-[400px] max-h-[600px] flex flex-col overflow-hidden rounded-[28px] border border-border bg-background/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <ChatHeader loading={loading} onClose={() => setOpen(false)} />

            {/* Messages area */}
            <div
              ref={viewportRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 min-h-0"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'oklch(0.28 0.01 255 / 0.35) transparent',
              }}
            >
              {insightCards.length > 0 && <InsightStrip cards={insightCards} />}

              {!hasUserMessages && !loading && (
                <EmptyState
                  disabled={loading}
                  onPick={(p) => void sendMessage(p)}
                />
              )}

              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {loading && <ThinkingBubble />}
            </div>

            {/* Composer */}
            <div className="border-t border-border bg-card/60 p-4">
              <form onSubmit={handleSubmit}>
                <div className="flex items-end gap-3 rounded-2xl border border-input bg-muted p-2 transition-colors focus-within:border-ring/60 focus-within:bg-accent/40">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    rows={1}
                    disabled={loading}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua pergunta..."
                    className="min-h-[44px] max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                    aria-label="Enviar mensagem"
                  >
                    {loading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                <span>Enter para enviar</span>
                <span>IA operacional</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger button ── */}
      <motion.button
        type="button"
        title=""
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileTap={{ scale: 0.96 }}
        className="pointer-events-auto flex items-center overflow-hidden rounded-full border border-border bg-background/90 p-2 shadow-xl shadow-black/50 backdrop-blur-xl transition-all duration-200 hover:bg-card"
        aria-label={open ? 'Fechar chat' : 'Abrir chat com IA'}
      >
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 shadow-xl">
          <img src="/favicon.ico" alt="Dashiel" className="h-8 w-8 object-contain" />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-400" />
        </div>
        <div
          className={cn(
            'overflow-hidden text-left transition-all duration-200',
            hovered ? 'max-w-[200px] opacity-100 pl-2 pr-2' : 'max-w-0 opacity-0',
          )}
        >
          <p className="whitespace-nowrap text-sm font-medium leading-none text-foreground">Falar com Dashiel</p>
          <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">Pergunte sobre sua operação</p>
        </div>
      </motion.button>
    </div>
  );
}
