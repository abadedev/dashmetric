'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  feedbackId: number | null;
  createdAt: string;
  createdBy: string | null;
}

interface FeedbackItem {
  id: number;
  message: string;
  userName: string | null;
}

function formatDate(val: string) {
  return new Date(val).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function NotificationsManager() {
  const queryClient = useQueryClient();

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Erro ao carregar notificações');
      return res.json() as Promise<{ data: NotificationItem[] }>;
    },
  });

  const { data: feedbackData } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      const res = await fetch('/api/feedback');
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{ data: FeedbackItem[] }>;
    },
  });

  const notifications = notifData?.data ?? [];
  const feedbacks = feedbackData?.data ?? [];

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [feedbackId, setFeedbackId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleCreate() {
    const trimTitle = title.trim();
    const trimBody = body.trim();
    if (!trimTitle || !trimBody) return;

    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimTitle,
          body: trimBody,
          feedbackId: feedbackId ? parseInt(feedbackId, 10) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setCreateError(d?.error ?? 'Erro ao criar notificação.');
        return;
      }
      setTitle('');
      setBody('');
      setFeedbackId('');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      setCreateError('Erro ao criar notificação.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    queryClient.setQueryData(['admin-notifications'], (old: { data: NotificationItem[] } | undefined) => {
      if (!old) return old;
      return { data: old.data.filter((n) => n.id !== id) };
    });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Notificações do Sistema</h2>
        <p className="text-sm text-muted-foreground">
          Mensagens enviadas a todos os usuários da plataforma.
        </p>
      </div>

      {/* Create form */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Nova notificação
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notif-title">Título <span className="text-destructive">*</span></Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nova funcionalidade disponível"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notif-body">Mensagem <span className="text-destructive">*</span></Label>
            <textarea
              id="notif-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Descreva o conteúdo da notificação..."
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notif-feedback">Vincular ao Feedback # <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            {feedbacks.length > 0 ? (
              <select
                id="notif-feedback"
                value={feedbackId}
                onChange={(e) => setFeedbackId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Nenhum —</option>
                {feedbacks.map((fb) => (
                  <option key={fb.id} value={fb.id}>
                    #{fb.id} — {fb.userName ?? 'Usuário'}: {fb.message.slice(0, 60)}{fb.message.length > 60 ? '…' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="notif-feedback"
                type="number"
                value={feedbackId}
                onChange={(e) => setFeedbackId(e.target.value)}
                placeholder="ID do feedback"
              />
            )}
          </div>
        </div>

        {createError && <p className="text-sm text-destructive">{createError}</p>}

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!title.trim() || !body.trim() || creating}>
            {creating ? 'Criando...' : 'Criar notificação'}
          </Button>
        </div>
      </Card>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma notificação criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.feedbackId && (
                      <Badge variant="secondary" className="text-[10px]">
                        Feedback #{n.feedbackId}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {formatDate(n.createdAt)}{n.createdBy ? ` · ${n.createdBy}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Deletar notificação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
