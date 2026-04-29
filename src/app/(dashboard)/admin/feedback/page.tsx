'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';

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

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as { role?: string } | undefined;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isPending && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isPending, isAdmin, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Erro ao carregar feedbacks');
      return res.json() as Promise<{ data: FeedbackItem[] }>;
    },
    enabled: isAdmin,
  });

  const feedbacks = data?.data ?? [];

  if (isPending || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Feedbacks</h1>
        <p className="text-sm text-muted-foreground">
          Mensagens enviadas pelos usuários do sistema.
        </p>
      </div>

      {isLoading ? null : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb.id} className="p-4">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {getInitials(fb.userName)}
                </Badge>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">{fb.userName ?? 'Usuário'}</span>
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
      )}
    </div>
  );
}
