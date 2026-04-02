'use client';

import { AlertCircle, Sparkles } from 'lucide-react';
import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChatInput } from './chat-input';
import { ChatLoading } from './chat-loading';
import { ChatMessage } from './chat-message';
import type { ChatMessageItem } from './chat-types';

const STORAGE_KEY = 'dashiel-chat-history';
const SESSION_KEY = 'dashiel-chat-session-id';

function createMessage(role: ChatMessageItem['role'], content: string): ChatMessageItem {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function createSessionId() {
  return `dashiel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ChatContainerProps {
  variant?: 'page' | 'widget';
  className?: string;
}

export function ChatContainer({ variant = 'page', className }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const isWidget = variant === 'widget';

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ChatMessageItem[];
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const storedSessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (storedSessionId) {
      setSessionId(storedSessionId);
      return;
    }

    const nextSessionId = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, nextSessionId);
    setSessionId(nextSessionId);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = useEffectEvent(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || isLoading) {
      return;
    }

    const userMessage = createMessage('user', content);

    startTransition(() => {
      setMessages((current) => [...current, userMessage]);
      setDraft('');
      setError(null);
    });

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content, sessionId }),
      });

      const payload = (await response.json()) as { response?: string; error?: string };
      if (!response.ok || !payload.response) {
        throw new Error(payload.error || 'Não foi possível obter resposta, tente novamente');
      }

      startTransition(() => {
        setMessages((current) => [...current, createMessage('assistant', payload.response!)]);
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível obter resposta, tente novamente';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col overflow-hidden border-border/70 bg-white py-0 shadow-sm',
        isWidget ? 'h-[min(72vh,680px)] rounded-[1.4rem]' : 'h-[calc(100vh-8.5rem)]',
        className
      )}
    >
      {!isWidget ? (
        <div className="border-b border-border/70 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7858,#ff3b12_70%)] text-white shadow-[0_10px_25px_rgba(255,79,34,0.28)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-semibold text-foreground">Dashiel</h2>
              <p className="text-xs text-muted-foreground">Assistente virtual da operação</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-5">
        <div className="flex w-full flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-1 items-start justify-start py-3">
              <div className="flex items-end gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7858,#ff3b12_70%)] text-white shadow-[0_8px_18px_rgba(255,79,34,0.28)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="max-w-[82%] rounded-[1.35rem] rounded-bl-sm bg-slate-100 px-4 py-4 text-sm leading-7 text-slate-800">
                  <p>Olá, eu sou o Dashiel.</p>
                  <p className="mt-3">
                    Posso te ajudar com dados da operação. Para melhores resultados, faça
                    perguntas curtas e objetivas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}

          {isLoading ? <ChatLoading /> : null}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-5">
        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <ChatInput value={draft} onChange={setDraft} onSubmit={handleSend} disabled={isLoading} />
    </Card>
  );
}
