'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, ThumbsUp, CheckCheck, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: number;
  message: string;
  userEmail: string | null;
  userName: string | null;
  status: string | null;
  createdAt: string | null;
}

function getInitials(name: string | null) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '??';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

const STATUS_CONFIG = {
  gostei:    { icon: ThumbsUp,   label: 'Gostei',    active: 'text-blue-500 border-blue-500/40 bg-blue-500/10' },
  realizado: { icon: CheckCheck, label: 'Realizado',  active: 'text-green-500 border-green-500/40 bg-green-500/10' },
  ignorado:  { icon: EyeOff,    label: 'Ignorar',    active: 'text-muted-foreground border-border bg-muted/40' },
} as const;

type Status = keyof typeof STATUS_CONFIG | 'pendente' | null;

export function FeedbackManager() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Erro ao carregar feedbacks');
      return res.json() as Promise<{ data: FeedbackItem[] }>;
    },
  });

  const feedbacks = data?.data ?? [];

  async function setStatus(id: number, newStatus: Status) {
    const status = newStatus === 'pendente' ? 'pendente' : newStatus;
    await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    queryClient.setQueryData(['admin-feedbacks'], (old: { data: FeedbackItem[] } | undefined) => {
      if (!old) return old;
      return { data: old.data.map((fb) => fb.id === id ? { ...fb, status } : fb) };
    });
  }

  if (isLoading) return null;

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Feedbacks</h2>
        <p className="text-sm text-muted-foreground">
          Mensagens enviadas pelos usuarios do sistema.
        </p>
      </div>

      <div className="space-y-3">
        {feedbacks.map((fb) => {
          const isIgnored = fb.status === 'ignorado';
          return (
            <Card
              key={fb.id}
              className={cn('p-4 transition-opacity', isIgnored && 'opacity-40')}
            >
              <div className="flex items-start gap-3">
                <Badge
                  variant="secondary"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                >
                  {getInitials(fb.userName)}
                </Badge>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">{fb.userName ?? 'Usuario'}</span>
                    {fb.userEmail && (
                      <span className="text-xs text-muted-foreground">{fb.userEmail}</span>
                    )}
                  </div>
                  {fb.createdAt && (
                    <p className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{fb.message}</p>

                  <div className="flex items-center gap-1.5 pt-1">
                    {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = fb.status === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setStatus(fb.id, isActive ? 'pendente' : key)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-all',
                            isActive
                              ? cfg.active
                              : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
