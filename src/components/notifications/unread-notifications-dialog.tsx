'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  feedbackId: number | null;
  createdAt: string;
  isRead: boolean;
}

export function UnreadNotificationsDialog() {
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [marking, setMarking] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return { data: [], unreadCount: 0 };
      return res.json() as Promise<{ data: NotificationItem[]; unreadCount: number }>;
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const unread = (data?.data ?? []).filter((n) => !n.isRead);

  useEffect(() => {
    if (!hasShown && unread.length > 0) {
      setOpen(true);
      setHasShown(true);
    }
  }, [hasShown, unread.length]);

  async function handleReadAll() {
    setMarking(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } finally {
      setMarking(false);
      setOpen(false);
    }
  }

  if (unread.length === 0 && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <DialogTitle>
              {unread.length === 1 ? '1 nova notificação' : `${unread.length} novas notificações`}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y">
          {unread.map((n) => (
            <div key={n.id} className="px-6 py-4">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
              {n.feedbackId && (
                <span className="mt-2 inline-block text-xs text-muted-foreground/60 font-medium">
                  Em resposta ao feedback #{n.feedbackId}
                </span>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handleReadAll} disabled={marking}>
            {marking ? 'Marcando...' : 'Entendido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
