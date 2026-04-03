'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
  PowerOff,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function WorkspaceDetail({ workspace }: { workspace: WorkspaceRow }) {
  const qc = useQueryClient();
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
  const memberUserIds = new Set(members.map((m) => m.userId));
  const addableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/workspaces/${workspace.id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspace.id] }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string | null }) =>
      fetch(`/api/admin/workspaces/${workspace.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspace.id] }),
  });

  async function handleAdd() {
    if (!selectedUserId) return;
    await fetch(`/api/admin/workspaces/${workspace.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
    });
    qc.invalidateQueries({ queryKey: ['workspace-members', workspace.id] });
    qc.invalidateQueries({ queryKey: ['admin-workspaces'] });
    setAddOpen(false);
    setSelectedUserId('');
  }

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
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
        <p className="text-center text-sm text-muted-foreground py-3">Nenhum membro ainda.</p>
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
            {members.map((m) => (
              <TableRow key={m.memberId}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{m.userName}</p>
                    <p className="text-xs text-muted-foreground">{m.userEmail}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(role: string | null) =>
                      changeRoleMutation.mutate({ userId: m.userId, role })
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
                  {new Date(m.grantedAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeMutation.mutate(m.userId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={(v: string | null) => { if (v) setSelectedUserId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {addableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v: string | null) => { if (v) setSelectedRole(v as typeof selectedRole); }}
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
  );
}

export function WorkspaceManager() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-workspaces'] }),
  });

  function handleNameChange(v: string) {
    setName(v);
    setSlug(slugify(v));
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), logoUrl: logoUrl.trim() || null }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? 'Erro ao criar');
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin-workspaces'] });
      setCreateOpen(false);
      setName('');
      setSlug('');
      setLogoUrl('');
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
            Gerencie os workspaces e seus membros.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Workspace
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}

      <div className="space-y-3">
        {workspaceList.map((ws) => (
          <Card key={ws.id} className={!ws.isActive ? 'opacity-60' : ''}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{ws.name}</CardTitle>
                    {!ws.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{ws.slug} · {ws.memberCount} membro{ws.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                  >
                    {expandedId === ws.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Membros
                  </Button>

                  {ws.isActive && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deactivateMutation.mutate(ws.id)}
                        >
                          <PowerOff className="mr-2 h-4 w-4" />
                          Desativar workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedId === ws.id && (
              <CardContent className="pt-0">
                <WorkspaceDetail workspace={ws} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
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
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="acme-corp"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                URL do Logo{' '}
                <Badge variant="secondary" className="text-[10px]">opcional</Badge>
              </Label>
              <Input
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
