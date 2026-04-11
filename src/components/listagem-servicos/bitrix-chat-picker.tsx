'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Search, Send, StickyNote, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  BitrixRecentChatItem,
  BitrixRecentChatsResponse,
  BitrixRouteErrorBody,
  BitrixSearchChatItem,
  BitrixSearchChatsResponse,
  BitrixSendMessageSuccessResponse,
} from '@/lib/bitrix/types';

interface BitrixChatPickerProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

const FIXED_NOTES_CHAT = {
  dialogId: 'chat929',
  name: 'Anotações',
};

const SEARCH_LIMIT = 20;

type FeedbackState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

type SearchListItem =
  | (BitrixSearchChatItem & { source: 'search' })
  | (BitrixRecentChatItem & { source: 'recent' });

interface PendingSelection {
  dialogId: string;
  name: string;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function getErrorMessage(body: BitrixRouteErrorBody | null, fallback: string) {
  return body?.error || fallback;
}

function ChatAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar: string | null;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

function ChatListButton({
  name,
  avatar,
  subtitle,
  badge,
  disabled,
  selected,
  onClick,
}: {
  name: string;
  avatar: string | null;
  subtitle: string;
  badge?: string | null;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-wait disabled:opacity-70 ${
        selected
          ? 'border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.16)]'
          : 'border-border/60 bg-background/50 hover:bg-accent'
      }`}
    >
      <ChatAvatar name={name} avatar={avatar} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      {badge ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function BitrixChatPicker({ open, onClose, message }: BitrixChatPickerProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentItems, setRecentItems] = useState<BitrixRecentChatItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLoadingMore, setRecentLoadingMore] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentNextCursor, setRecentNextCursor] = useState<string | null>(null);
  const [recentSearchSweepLoading, setRecentSearchSweepLoading] = useState(false);
  const [searchItems, setSearchItems] = useState<BitrixSearchChatItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNext, setSearchNext] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [sendingDialogId, setSendingDialogId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);

  const shouldSearch = debouncedSearch.trim().length >= 3;
  const normalizedSearch = debouncedSearch.trim().toLocaleLowerCase('pt-BR');
  const mergedSearchItems = useMemo<SearchListItem[]>(() => {
    if (!shouldSearch) {
      return [];
    }

    const searchMatches = searchItems.map((item) => ({
      ...item,
      source: 'search' as const,
    }));
    const recentMatches = recentItems
      .filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
      .map((item) => ({
        ...item,
        source: 'recent' as const,
      }));
    const deduped = new Map<string, SearchListItem>();

    for (const item of [...searchMatches, ...recentMatches]) {
      if (!deduped.has(item.dialogId)) {
        deduped.set(item.dialogId, item);
      }
    }

    return Array.from(deduped.values());
  }, [normalizedSearch, recentItems, searchItems, shouldSearch]);
  const activeItems = shouldSearch ? mergedSearchItems : recentItems;
  const activeError = shouldSearch ? searchError : recentError;
  const activeLoading = shouldSearch ? searchLoading && mergedSearchItems.length === 0 : recentLoading;
  const activeLoadingMore = shouldSearch ? searchLoadingMore : recentLoadingMore;
  const canLoadMore = shouldSearch ? searchNext !== null : recentNextCursor !== null;
  const showMinCharsHint = search.trim().length > 0 && !shouldSearch;

  const messagePreview = useMemo(() => {
    const normalized = message.trim().replace(/\s+/g, ' ');
    return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
  }, [message]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setRecentItems([]);
      setRecentNextCursor(null);
      setRecentError(null);
      setRecentSearchSweepLoading(false);
      setSearchItems([]);
      setSearchNext(null);
      setSearchError(null);
      setFeedback(null);
      setSendingDialogId(null);
      setPendingSelection(null);
      return;
    }

    void loadRecentChats();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!shouldSearch) {
      setSearchItems([]);
      setSearchNext(null);
      setSearchError(null);
      return;
    }

    void searchChats(debouncedSearch, 0, false);
  }, [debouncedSearch, open, shouldSearch]);

  useEffect(() => {
    if (!open || !shouldSearch || !recentNextCursor || recentSearchSweepLoading) {
      return;
    }

    void loadRecentChats(recentNextCursor, true, true);
  }, [open, recentNextCursor, recentSearchSweepLoading, shouldSearch]);

  async function loadRecentChats(cursor?: string | null, append = false, background = false) {
    const controller = new AbortController();
    const query = new URLSearchParams({
      skipOpenlines: 'Y',
    });

    if (cursor) {
      query.set('lastMessageDate', cursor);
    }

    if (append) {
      if (background) {
        setRecentSearchSweepLoading(true);
      } else {
        setRecentLoadingMore(true);
      }
    } else {
      setRecentLoading(true);
      setRecentError(null);
    }

    try {
      const response = await fetch(`/api/bitrix/chats?${query.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await readJsonResponse<BitrixRouteErrorBody | null>(response).catch(() => null);
        throw new Error(getErrorMessage(body, 'Não foi possível carregar as conversas recentes.'));
      }

      const data = await readJsonResponse<BitrixRecentChatsResponse>(response);
      setRecentItems((current) => append ? [...current, ...data.items] : data.items);
      setRecentNextCursor(data.nextCursor);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const message = error instanceof Error ? error.message : 'Não foi possível carregar as conversas recentes.';
      setRecentError(message);
    } finally {
      setRecentLoading(false);
      setRecentLoadingMore(false);
      setRecentSearchSweepLoading(false);
      controller.abort();
    }
  }

  async function searchChats(query: string, offset: number, append: boolean) {
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query,
      offset: String(offset),
      limit: String(SEARCH_LIMIT),
    });

    if (append) {
      setSearchLoadingMore(true);
    } else {
      setSearchLoading(true);
      setSearchError(null);
    }

    try {
      const response = await fetch(`/api/bitrix/search-chats?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await readJsonResponse<BitrixRouteErrorBody | null>(response).catch(() => null);
        throw new Error(getErrorMessage(body, 'Não foi possível buscar chats no Bitrix24.'));
      }

      const data = await readJsonResponse<BitrixSearchChatsResponse>(response);
      setSearchItems((current) => append ? [...current, ...data.items] : data.items);
      setSearchNext(data.next);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const message = error instanceof Error ? error.message : 'Não foi possível buscar chats no Bitrix24.';
      setSearchError(message);
    } finally {
      setSearchLoading(false);
      setSearchLoadingMore(false);
      controller.abort();
    }
  }

  async function sendMessage(dialogId: string, destinationName: string) {
    setSendingDialogId(dialogId);
    setFeedback(null);

    try {
      const response = await fetch('/api/bitrix/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dialogId,
          message,
        }),
      });

      if (!response.ok) {
        const body = await readJsonResponse<BitrixRouteErrorBody | null>(response).catch(() => null);
        throw new Error(getErrorMessage(body, 'Não foi possível enviar a mensagem.'));
      }

      await readJsonResponse<BitrixSendMessageSuccessResponse>(response);
      const successMessage = `Mensagem enviada para ${destinationName}.`;
      setFeedback({ type: 'success', text: successMessage });
      toast.success(successMessage);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.';
      setFeedback({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSendingDialogId(null);
    }
  }

  function handleSelect(dialogId: string, name: string) {
    setFeedback(null);
    setPendingSelection({ dialogId, name });
  }

  function renderBody() {
    if (activeLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (activeError) {
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Erro ao carregar conversas</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => shouldSearch ? void searchChats(debouncedSearch, 0, false) : void loadRecentChats()}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (activeItems.length === 0) {
      if (search.trim().length > 0 && search.trim().length < 3) {
        return (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
            <p className="text-sm font-medium text-foreground">Continue digitando</p>
            <p className="mt-1 text-xs text-muted-foreground">A busca no Bitrix24 exige pelo menos 3 caracteres.</p>
          </div>
        );
      }

      return (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            {shouldSearch ? 'Nenhum chat encontrado' : 'Nenhuma conversa recente encontrada'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {shouldSearch ? 'Tente outro termo de busca.' : 'Abra novas conversas no Bitrix24 para vê-las aqui.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {shouldSearch ? mergedSearchItems.map((item) => {
          const isSending = sendingDialogId === item.dialogId;
          const subtitle = item.source === 'search'
            ? `${item.type} • ${item.userCounter} participante${item.userCounter === 1 ? '' : 's'}`
            : item.lastMessageDate
              ? `Última mensagem em ${new Date(item.lastMessageDate).toLocaleString('pt-BR')}`
              : 'Conversa recente';
          const badge = item.counter > 0 ? String(item.counter) : null;

          return (
            <ChatListButton
              key={`${item.dialogId}-${item.source}`}
              name={item.name}
              avatar={item.avatar}
              subtitle={subtitle}
              badge={badge}
              disabled={isSending}
              selected={pendingSelection?.dialogId === item.dialogId}
              onClick={() => handleSelect(item.dialogId, item.name)}
            />
          );
        }) : recentItems.map((item) => {
          const isSending = sendingDialogId === item.dialogId;
          const subtitle = item.lastMessageDate
            ? `Última mensagem em ${new Date(item.lastMessageDate).toLocaleString('pt-BR')}`
            : 'Conversa recente';
          const badge = item.counter > 0 ? String(item.counter) : null;

          return (
            <ChatListButton
              key={`${item.dialogId}-recent`}
              name={item.name}
              avatar={item.avatar}
              subtitle={subtitle}
              badge={badge}
              disabled={isSending}
              selected={pendingSelection?.dialogId === item.dialogId}
              onClick={() => handleSelect(item.dialogId, item.name)}
            />
          );
        })}

        {canLoadMore ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={activeLoadingMore}
            onClick={() => shouldSearch
              ? void searchChats(debouncedSearch, searchNext ?? 0, true)
              : void loadRecentChats(recentNextCursor, true)}
          >
            {activeLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Carregar mais
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Enviar para Bitrix24</DialogTitle>
          <DialogDescription>
            Escolha uma conversa recente, busque outro chat ou use o atalho fixo de anotações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mensagem</p>
            <p className="mt-1 line-clamp-3 text-sm text-foreground">{messagePreview || 'Mensagem vazia'}</p>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-xl border-border/70 px-3 py-5"
            disabled={sendingDialogId === FIXED_NOTES_CHAT.dialogId}
            onClick={() => void sendMessage(FIXED_NOTES_CHAT.dialogId, FIXED_NOTES_CHAT.name)}
          >
            {sendingDialogId === FIXED_NOTES_CHAT.dialogId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <StickyNote className="h-4 w-4 text-amber-500" />
            )}
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="text-sm font-medium text-foreground">Anotações</span>
              <span className="text-xs text-muted-foreground">Enviar direto para `chat929`</span>
            </div>
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar chats do Bitrix24"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="px-1 text-xs text-muted-foreground">
            {showMinCharsHint
              ? 'Digite pelo menos 3 caracteres para buscar chats no Bitrix24.'
              : shouldSearch
                ? recentSearchSweepLoading
                  ? 'Buscando no Bitrix24 e varrendo mais conversas recentes em segundo plano.'
                  : pendingSelection
                    ? `Chat selecionado: ${pendingSelection.name}. Confirme o envio abaixo.`
                    : 'Selecione um resultado e confirme o envio abaixo.'
                : pendingSelection
                  ? `Chat selecionado: ${pendingSelection.name}. Confirme o envio abaixo.`
                  : 'Mostrando conversas recentes. Você também pode buscar manualmente acima.'}
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-background/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium text-foreground">
                {shouldSearch ? `Resultados para "${debouncedSearch}"` : 'Conversas recentes'}
              </p>
            </div>

            {feedback ? (
              <div
                className={
                  feedback.type === 'success'
                    ? 'mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700'
                    : 'mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'
                }
              >
                {feedback.text}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {renderBody()}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {pendingSelection ? (
            <Button
              onClick={() => void sendMessage(pendingSelection.dialogId, pendingSelection.name)}
              disabled={sendingDialogId === pendingSelection.dialogId}
              className="gap-2"
            >
              {sendingDialogId === pendingSelection.dialogId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Confirmar envio
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
