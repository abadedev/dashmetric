'use client';

import { startTransition, useEffect, useState } from 'react';
import type {
  DashielApiRequest,
  DashielApiResponse,
  DashielErrorResponse,
  DashielMessage,
  DashielScreenContext,
} from '@/lib/dashiel/types';

const STORAGE_KEY = 'dashiel-v2-chat-history';

function createMessage(
  role: DashielMessage['role'],
  content: string,
  extras?: Pick<DashielMessage, 'suggestions' | 'insightCards'>
): DashielMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    suggestions: extras?.suggestions,
    insightCards: extras?.insightCards,
  };
}

interface UseDashielChatOptions {
  context?: DashielScreenContext;
}

export function useDashielChat({ context }: UseDashielChatOptions = {}) {
  const [messages, setMessages] = useState<DashielMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashielMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [isHydrated, messages]);

  async function submitMessage(rawMessage: string) {
    const content = rawMessage.trim();
    if (!content || isLoading) {
      return false;
    }

    const nextUserMessage = createMessage('user', content);

    startTransition(() => {
      setMessages((current) => [...current, nextUserMessage]);
      setInput('');
      setError(null);
    });

    setIsLoading(true);

    try {
      const payload: DashielApiRequest = {
        message: content,
        context,
        history: [...messages, nextUserMessage].map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      const response = await fetch('/api/dashiel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as DashielApiResponse | DashielErrorResponse;
      if (!response.ok || !('success' in data) || !data.success) {
        throw new Error('error' in data ? data.error : 'Não foi possível consultar o Dashiel.');
      }

      startTransition(() => {
        setMessages((current) => [
          ...current,
          createMessage('assistant', data.answer, {
            suggestions: data.suggestions,
            insightCards: data.insightCards,
          }),
        ]);
      });

      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Não foi possível consultar o Dashiel.'
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function runQuickAction(prompt: string) {
    return submitMessage(prompt);
  }

  function clearChat() {
    setMessages([]);
    setError(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    isHydrated,
    submitMessage,
    runQuickAction,
    clearChat,
  };
}
