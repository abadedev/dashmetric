'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FeedbackItem {
  id: number;
  message: string;
  userEmail: string | null;
  userName: string | null;
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

export function FeedbackManager() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Erro ao carregar feedbacks');
      return res.json() as Promise<{ data: FeedbackItem[] }>;
    },
  });

  const feedbacks = data?.data ?? [];

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
        {feedbacks.map((fb) => (
          <Card key={fb.id} className="p-4">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {getInitials(fb.userName)}
              </Badge>
              <div className="min-w-0 flex-1 space-y-1">
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
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
