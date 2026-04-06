'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Palette,
  Plus,
  Power,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type WorkspaceTheme = 'dark' | 'light';

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  defaultTheme: WorkspaceTheme;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
};

type MemberRow = {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  role: string;
  grantedAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Leitor',
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function WorkspaceAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className="h-11 w-11 rounded-xl border border-border/70 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function WorkspaceSettings({
  workspace,
}: {
  workspace: WorkspaceRow;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl ?? '');
  const [defaultTheme, setDefaultTheme] = useState<WorkspaceTheme>(workspace.defaultTheme ?? 'dark');
  const [feedback, setFeedback] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          defaultTheme,
        }),
      });

      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Falha ao salvar workspace');
      return payload;
    },
    onSuccess: async () => {
      setFeedback('Configurações salvas com sucesso.');
      await queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces', 'admin-page'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Falha ao salvar workspace');
    },
  });

  const isDirty = useMemo(
    () =>
      name.trim() !== workspace.name
      || (logoUrl.trim() || null) !== (workspace.logoUrl ?? null)
      || defaultTheme !== workspace.defaultTheme,
    [defaultTheme, logoUrl, name, workspace.defaultTheme, workspace.logoUrl, workspace.name],
  );

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Configurações do workspace</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`workspace-name-${workspace.id}`}>Nome do workspace</Label>
            <Input
              id={`workspace-name-${workspace.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: DSTECH"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`workspace-theme-${workspace.id}`}>Tema padrão</Label>
            <Select value={defaultTheme} onValueChange={(value) => setDefaultTheme(value as WorkspaceTheme)}>
              <SelectTrigger id={`workspace-theme-${workspace.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Aplicado quando o usuário acessa este workspace.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`workspace-logo-${workspace.id}`}>Logo do workspace</Label>
            <Input
              id={`workspace-logo-${workspace.id}`}
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://... ou deixe vazio para usar iniciais"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setFeedback(null);
                updateMutation.mutate();
              }}
              disabled={!name.trim() || !isDirty || updateMutation.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
            </Button>
            {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pré-visualização
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-3">
            <WorkspaceAvatar name={name.trim() || workspace.name} logoUrl={logoUrl.trim() || null} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name.trim() || workspace.name}</p>
              <p className="text-xs text-muted-foreground">/{workspace.slug}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              Tema: {defaultTheme === 'dark' ? 'Escuro' : 'Claro'}
            </Badge>
            <Badge variant={workspace.isActive ? 'outline' : 'secondary'}>
              {workspace.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Se não houver logo, o sistema usa as iniciais do workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkspaceDetail({ workspace }: { workspace: WorkspaceRow }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');

  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspace.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/workspaces/${workspace.id}/members`);
      return res.json() as Promise<{ data: MemberRow[] }>;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      return res.json() as Promise<{ data: UserRow[] }>;
    },
  });

  const members = membersData?.data ?? [];
  const allUsers = usersData?.data ?? [];
  const memberUserIds = new Set(members.map((member) => member.userId));
  const addableUsers = allUsers.filter((user) => !memberUserIds.has(user.id));

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/workspaces/${workspace.id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string | null }) =>
      fetch(`/api/admin/workspaces/${workspace.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] }),
  });

  async function handleAdd() {
    if (!selectedUserId) return;

    await fetch(`/api/admin/workspaces/${workspace.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
    });

    await queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    setAddOpen(false);
    setSelectedUserId('');
  }

  return (
    <div className="mt-4 space-y-4">
      <WorkspaceSettings workspace={workspace} />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Membros ({members.length})
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            disabled={addableUsers.length === 0}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>

        {members.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Nenhum membro ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.memberId}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{member.userName}</p>
                      <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(role: string | null) =>
                        changeRoleMutation.mutate({ userId: member.userId, role })
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Membro</SelectItem>
                        <SelectItem value="VIEWER">Leitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(member.grantedAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(member.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar membro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Usuário</Label>
                <Select value={selectedUserId} onValueChange={(value: string | null) => { if (value) setSelectedUserId(value); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: string | null) => { if (value) setSelectedRole(value as typeof selectedRole); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Membro</SelectItem>
                    <SelectItem value="VIEWER">Leitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={!selectedUserId}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function WorkspaceManager() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultTheme, setDefaultTheme] = useState<WorkspaceTheme>('dark');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workspaces');
      return res.json() as Promise<{ data: WorkspaceRow[] }>;
    },
  });

  const workspaceList = data?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/workspaces/${id}/deactivate`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces', 'admin-page'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/workspaces/${id}/reactivate`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces', 'admin-page'] });
    },
  });

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          logoUrl: logoUrl.trim() || null,
          defaultTheme,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? 'Erro ao criar workspace');
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces', 'admin-page'] });

      setCreateOpen(false);
      setName('');
      setSlug('');
      setLogoUrl('');
      setDefaultTheme('dark');
    } catch {
      setError('Erro ao criar workspace');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gerencie workspaces, branding, tema padrão e membros.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Workspace
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : null}

      <div className="space-y-3">
        {workspaceList.map((workspace) => (
          <Card key={workspace.id} className={!workspace.isActive ? 'opacity-75' : ''}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-3">
                <WorkspaceAvatar name={workspace.name} logoUrl={workspace.logoUrl} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{workspace.name}</CardTitle>
                    <Badge variant={workspace.isActive ? 'outline' : 'secondary'} className="text-xs">
                      {workspace.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Tema {workspace.defaultTheme === 'dark' ? 'escuro' : 'claro'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{workspace.slug} · {workspace.memberCount} membro{workspace.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === workspace.id ? null : workspace.id)}
                  >
                    {expandedId === workspace.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Gerenciar
                  </Button>

                  {workspace.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deactivateMutation.mutate(workspace.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      <Power className="mr-1.5 h-4 w-4" />
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reactivateMutation.mutate(workspace.id)}
                      disabled={reactivateMutation.isPending}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reativar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedId === workspace.id ? (
              <CardContent className="pt-0">
                <WorkspaceDetail workspace={workspace} />
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <DialogTitle>Criar Workspace</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Acme Corp"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="acme-corp"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Logo do workspace</Label>
              <Input
                placeholder="https://..."
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tema padrão</Label>
              <Select value={defaultTheme} onValueChange={(value) => setDefaultTheme(value as WorkspaceTheme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !slug.trim() || creating}>
              {creating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
