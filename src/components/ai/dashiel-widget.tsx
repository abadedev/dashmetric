'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  SendHorizonal,
  Sparkles,
  User2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

const quickPrompts = [
  'Como estamos hoje?',
  'Resumo geral',
  'Atendimentos em aberto',
  'Instalações do período',
  'Ranking dos técnicos',
  'SLA do período',
  'Suporte por telefone',
  'Vendas do período',
  'Cancelamentos',
  'Indicadores de qualidade',
];

const starterMessage =
  'Estou pronto para analisar o workspace com base nos dados reais e responder de forma objetiva. Você pode pedir resumo, ranking, SLA, suporte, vendas, cancelamentos ou qualidade.';

const toneClasses: Record<NonNullable<InsightCard['tone']>, string> = {
  default: 'border-border/70 bg-background/75 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]',
  good: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

function classifyAssistantMessage(content: string, fallback: MessageKind = 'default'): MessageKind {
  const normalized = content.toLowerCase();

  if (
    normalized.includes('sem dados') ||
    normalized.includes('nenhum dado') ||
    normalized.includes('nao encontrei') ||
    normalized.includes('não encontrei') ||
    normalized.includes('nenhum registro') ||
    normalized.includes('nada encontrado')
  ) {
    return 'empty';
  }

  return fallback;
}

function buildMessage(role: Message['role'], content: string, kind?: MessageKind): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    kind,
  };
}

function ChatHeader({ loading }: { loading: boolean }) {
  return (
    <SheetHeader className="gap-0 border-b border-border/70 px-5 py-5">
      <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_92%,white_8%),color-mix(in_oklab,var(--background)_96%,black_4%))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/15">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-[15px] font-semibold tracking-tight">Dashiel</SheetTitle>
              <Badge variant="outline" className="gap-1.5 border-emerald-500/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-current" />
                {loading ? 'Processando' : 'Pronto'}
              </Badge>
            </div>
            <SheetDescription className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Assistente operacional para consultas rápidas do workspace, com respostas baseadas nos dados atuais.
            </SheetDescription>
          </div>
        </div>
      </div>
    </SheetHeader>
  );
}

function InsightStrip({ cards }: { cards: InsightCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Sinais rápidos
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={`${card.label}-${card.value}`}
            className={cn('rounded-2xl border px-4 py-3.5', toneClasses[card.tone ?? 'default'])}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
              {card.label}
            </div>
            <div className="mt-1.5 text-sm font-semibold tracking-tight">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChatEmptyState({
  onPickSuggestion,
  disabled,
}: {
  onPickSuggestion: (suggestion: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_88%,white_12%),var(--card))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Bot className="size-4" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Conversa pronta para começar
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Faça uma pergunta direta sobre operação, desempenho ou atendimento. O Dashiel responde com foco em leitura rápida e contexto útil para tomada de decisão.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quickPrompts.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPickSuggestion(suggestion)}
            className="group rounded-2xl border border-border/75 bg-background/80 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{suggestion}</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ThinkingState() {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
        <LoaderCircle className="size-4 animate-spin" />
      </div>
      <div className="max-w-[85%] rounded-[22px] rounded-tl-md border border-border/70 bg-card/80 px-4 py-3.5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Analisando os dados</span>
          <div className="flex items-center gap-1">
            <span className="size-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:0ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:180ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:360ms]" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-3 w-56 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function NoDataState() {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/70 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <AlertCircle className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Sem dados para este recorte</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Tente ajustar o período, pedir um resumo mais amplo ou consultar outro módulo.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isError = message.kind === 'error';

  return (
    <div className={cn('flex items-start gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div
          className={cn(
            'mt-1 flex size-9 shrink-0 items-center justify-center rounded-full ring-1',
            isError
              ? 'bg-destructive/10 text-destructive ring-destructive/15'
              : 'bg-primary/10 text-primary ring-primary/15'
          )}
        >
          {isError ? <AlertCircle className="size-4" /> : <Bot className="size-4" />}
        </div>
      )}

      <div
        className={cn(
          'max-w-[86%] rounded-[24px] px-4 py-3.5 text-sm leading-6 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]',
          isUser
            ? 'rounded-tr-md bg-primary text-primary-foreground'
            : isError
              ? 'rounded-tl-md border border-destructive/20 bg-destructive/8 text-foreground'
              : 'rounded-tl-md border border-border/70 bg-card/78 text-card-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {isUser && (
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-border/70">
          <User2 className="size-4" />
        </div>
      )}
    </div>
  );
}

function ChatSuggestions({
  suggestions,
  disabled,
  onPickSuggestion,
}: {
  suggestions: string[];
  disabled: boolean;
  onPickSuggestion: (suggestion: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Sugestões rápidas
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Atalhos prontos para acelerar a conversa
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          <CheckCircle2 className="size-3" />
          Operação
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPickSuggestion(suggestion)}
            className="rounded-full border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/20 hover:bg-accent/45 disabled:pointer-events-none disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}

function ChatComposer({
  value,
  disabled,
  canSend,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  canSend: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-border/75 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,white_4%),var(--background))] p-3 shadow-[0_24px_44px_-36px_rgba(15,23,42,0.42)]">
      <div className="overflow-hidden rounded-[22px] border border-border/65 bg-background/85 transition-colors focus-within:border-primary/25">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pergunte sobre resumo, SLA, ranking, atendimentos ou qualquer sinal operacional do período..."
          rows={4}
          disabled={disabled}
          className="min-h-[112px] w-full resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Respostas guiadas pelos dados ativos do workspace.
          </p>
          <Button type="submit" size="lg" disabled={!canSend} className="min-w-[108px]">
            {disabled ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
            {disabled ? 'Enviando' : 'Enviar'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function DashielWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: starterMessage,
      kind: 'default',
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(quickPrompts);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const canSend = input.trim().length > 0 && !loading;
  const hasUserMessages = messages.some((message) => message.role === 'user');
  const showEmptyState = !hasUserMessages && !loading;
  const hasNoDataMessage = messages.some((message) => message.kind === 'empty');

  const panelLabel = useMemo(() => {
    return loading ? 'Dashiel está analisando' : 'Abrir Dashiel';
  }, [loading]);

  useEffect(() => {
    if (!open) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading, open]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    const userMessage = buildMessage('user', trimmed);

    setLoading(true);
    setInput('');
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch('/api/dashiel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        answer?: string;
        suggestions?: string[];
        insightCards?: InsightCard[];
        error?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? 'Nao foi possivel consultar os dados no momento.');
      }

      const assistantAnswer = data.answer.trim();

      setMessages((current) => [
        ...current,
        buildMessage('assistant', assistantAnswer, classifyAssistantMessage(assistantAnswer)),
      ]);
      setSuggestions(data.suggestions?.length ? data.suggestions : quickPrompts);
      setInsightCards(data.insightCards ?? []);
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : 'Nao foi possivel consultar os dados agora.';

      setMessages((current) => [...current, buildMessage('assistant', fallback, 'error')]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 md:p-6">
        <SheetTrigger
          render={
            <Button
              size="icon-lg"
              className="pointer-events-auto rounded-full border border-primary/15 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_92%,white_8%),var(--primary))] shadow-[0_22px_44px_-20px_color-mix(in_oklab,var(--primary)_52%,transparent)]"
              aria-label={panelLabel}
            />
          }
        >
          <MessageSquareText className="size-5" />
        </SheetTrigger>
      </div>

      <SheetContent
        side="right"
        className="w-[calc(100vw-1rem)] max-w-[440px] border-l border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--popover)_95%,white_5%),var(--popover))] p-0 supports-backdrop-filter:backdrop-blur-xl"
      >
        <ChatHeader loading={loading} />

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5"
          >
            <InsightStrip cards={insightCards} />

            {showEmptyState && (
              <ChatEmptyState
                disabled={loading}
                onPickSuggestion={(suggestion) => void sendMessage(suggestion)}
              />
            )}

            <section className="space-y-3">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}

              {loading && <ThinkingState />}

              {hasNoDataMessage && !loading && <NoDataState />}
            </section>
          </div>

          <div className="border-t border-border/70 bg-background/45 px-4 py-4 sm:px-5">
            <div className="space-y-4">
              <ChatSuggestions
                suggestions={suggestions}
                disabled={loading}
                onPickSuggestion={(suggestion) => void sendMessage(suggestion)}
              />

              <ChatComposer
                value={input}
                disabled={loading}
                canSend={canSend}
                onChange={setInput}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
