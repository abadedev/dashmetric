'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Loader2, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UserItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  globalRole: string;
  workspaceRole: string | null;
  createdAt: string;
};

export function usePendingUsersCount() {
  const { data } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return { data: [] as UserItem[] };
      return res.json() as Promise<{ data: UserItem[] }>;
    },
    staleTime: 30_000,
  });
  return (data?.data ?? []).filter((u) => u.workspaceRole === null).length;
}

export function PendingUsersManager() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      return res.json() as Promise<{ data: UserItem[] }>;
    },
  });

  const pending = (data?.data ?? []).filter((u) => u.workspaceRole === null);

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/admin/pending-users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'Erro ao aprovar');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">Falha ao carregar usuários pendentes.</p>
    );
  }

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <CheckCircle className="h-10 w-10 text-green-500/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum usuário aguardando aprovação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Estes usuários fizeram login mas ainda não possuem acesso a nenhum workspace. Clique em
        <strong className="text-foreground"> Aprovar como Visualizador </strong>
        para liberar o acesso básico. Você pode ajustar o papel depois.
      </p>

      <div className="space-y-2">
        {pending.map((u) => {
          const initials = u.name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('');

          const isPending = approveMutation.isPending && approveMutation.variables === u.id;

          return (
            <Card key={u.id}>
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image}
                      alt={u.name}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full border border-border/70 object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-bold text-foreground">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm">{u.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="mr-1 h-2.5 w-2.5" />
                        Aguardando
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{u.email}</CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 text-xs"
                    disabled={isPending || approveMutation.isPending}
                    onClick={() => approveMutation.mutate(u.id)}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    {isPending ? 'Aprovando...' : 'Aprovar como Visualizador'}
                  </Button>
                </div>

                {approveMutation.isError && approveMutation.variables === u.id && (
                  <p className="mt-1 text-xs text-destructive">
                    {approveMutation.error instanceof Error
                      ? approveMutation.error.message
                      : 'Erro ao aprovar'}
                  </p>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
