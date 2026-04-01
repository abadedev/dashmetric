'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserGroup = { id: number; name: string };

type UserItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: 'user' | 'editor' | 'admin';
  createdAt: string;
  groups: UserGroup[];
};

type PermissionItem = {
  id: number;
  key: string;
  moduleSlug: string;
  action: string;
  description: string | null;
};

type GroupItem = {
  id: number;
  name: string;
  description: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleLabel(role: string) {
  if (role === 'admin') return 'Administrador';
  if (role === 'editor') return 'Editor';
  return 'Visualizador';
}

function roleBadgeVariant(role: string): 'destructive' | 'default' | 'secondary' {
  if (role === 'admin') return 'destructive';
  if (role === 'editor') return 'default';
  return 'secondary';
}

function humanizeSlug(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function groupByModule(perms: PermissionItem[]) {
  const map = new Map<string, PermissionItem[]>();
  for (const p of perms) {
    const list = map.get(p.moduleSlug) ?? [];
    list.push(p);
    map.set(p.moduleSlug, list);
  }
  return map;
}

function UserAvatar({ user }: { user: UserItem }) {
  if (user.image) {
    return (
      <img
        src={user.image}
        alt={user.name}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User sheet
// ---------------------------------------------------------------------------

function UserSheet({
  user,
  allGroups,
  allPermissions,
  onClose,
}: {
  user: UserItem;
  allGroups: GroupItem[];
  allPermissions: PermissionItem[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  // Role state
  const [selectedRole, setSelectedRole] = useState<'user' | 'editor' | 'admin'>(user.role);

  // Group state — set of groupIds the user belongs to
  const [userGroupIds, setUserGroupIds] = useState<Set<number>>(
    new Set(user.groups.map((g) => g.id))
  );

  // Individual permission state — set of permissionIds
  const { data: indivData } = useQuery({
    queryKey: ['user-individual-permissions', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`);
      if (!res.ok) throw new Error('Falha ao carregar permissões individuais');
      const json = await res.json() as { data: PermissionItem[] };
      return json.data;
    },
  });

  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(
    new Set(indivData?.map((p) => p.id) ?? [])
  );

  // Keep selectedPermIds in sync after query loads
  const resolvedPermIds =
    indivData !== undefined ? new Set(indivData.map((p) => p.id)) : selectedPermIds;
  const [localPermIds, setLocalPermIds] = useState<Set<number> | null>(null);
  const effectivePermIds = localPermIds ?? resolvedPermIds;

  // Role mutation
  const roleMutation = useMutation({
    mutationFn: async (role: 'user' | 'editor' | 'admin') => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar nível de acesso');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Group toggle mutation
  const groupAddMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/admin/users/${user.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error('Falha ao adicionar grupo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const groupRemoveMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/admin/users/${user.id}/groups`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error('Falha ao remover grupo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleGroupToggle = (groupId: number, checked: boolean) => {
    setUserGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(groupId);
        groupAddMutation.mutate(groupId);
      } else {
        next.delete(groupId);
        groupRemoveMutation.mutate(groupId);
      }
      return next;
    });
  };

  // Individual permissions mutation
  const permsMutation = useMutation({
    mutationFn: async (permissionIds: number[]) => {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds }),
      });
      if (!res.ok) throw new Error('Falha ao salvar permissões individuais');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-individual-permissions', user.id] });
    },
  });

  const handlePermToggle = (permId: number, checked: boolean) => {
    setLocalPermIds((prev) => {
      const base = prev ?? resolvedPermIds;
      const next = new Set(base);
      if (checked) next.add(permId);
      else next.delete(permId);
      return next;
    });
  };

  const byModule = groupByModule(allPermissions);

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden">
      <SheetHeader className="border-b px-4 pb-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div>
            <SheetTitle>{user.name}</SheetTitle>
            <SheetDescription>{user.email}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Role */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Nível de acesso</h3>
          <div className="flex items-center gap-3">
            <Select
              value={selectedRole}
              onValueChange={(v) => {
                if (!v) return;
                const role = v as 'user' | 'editor' | 'admin';
                setSelectedRole(role);
                roleMutation.mutate(role);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Visualizador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {roleMutation.isPending && (
              <span className="text-xs text-muted-foreground">Salvando...</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Visualizador: acesso de leitura. Editor: pode importar dados. Administrador: acesso total ao painel.
          </p>
        </section>

        {/* Groups */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Grupos de acesso</h3>
          {allGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {allGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={userGroupIds.has(group.id)}
                    onChange={(e) => handleGroupToggle(group.id, e.target.checked)}
                  />
                  <div>
                    <span className="font-medium">{group.name}</span>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Individual permissions */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Permissões individuais extras</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essas permissões se somam às do grupo. Use para casos específicos.
            </p>
          </div>

          {byModule.size === 0 ? (
            <p className="text-xs text-muted-foreground">
              Carregando permissões...
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(byModule.entries()).map(([slug, perms]) => (
                <div key={slug} className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    {humanizeSlug(slug)}
                  </p>
                  <div className="space-y-1.5">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={effectivePermIds.has(perm.id)}
                          onChange={(e) => handlePermToggle(perm.id, e.target.checked)}
                        />
                        <span>
                          {perm.action === 'read' ? 'Visualizar' : 'Editar / Importar dados'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            size="sm"
            onClick={() => permsMutation.mutate(Array.from(effectivePermIds))}
            disabled={permsMutation.isPending}
          >
            {permsMutation.isPending ? 'Salvando...' : 'Salvar permissões individuais'}
          </Button>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UsersManager() {
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      return res.json() as Promise<{ data: UserItem[] }>;
    },
  });

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/permissions');
      if (!res.ok) throw new Error('Falha ao carregar permissões');
      return res.json() as Promise<{ data: PermissionItem[] }>;
    },
  });

  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/groups');
      if (!res.ok) throw new Error('Falha ao carregar grupos');
      return res.json() as Promise<{ data: GroupItem[] }>;
    },
  });

  const users = usersData?.data ?? [];
  const allPermissions = permsData?.data ?? [];
  const allGroups = groupsData?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserCog className="h-5 w-5" />
            <CardTitle>Usuários</CardTitle>
          </div>
          <CardDescription>
            Gerencie o nível de acesso de cada pessoa e os grupos aos quais ela pertence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-4 py-3"
                >
                  <UserAvatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.groups.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {u.groups.map((g) => (
                          <Badge key={g.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={roleBadgeVariant(u.role)}>
                      {roleLabel(u.role)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(u)}
                    >
                      Gerenciar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <SheetContent side="right" showCloseButton className="w-full sm:max-w-lg p-0">
          {selectedUser && (
            <UserSheet
              user={selectedUser}
              allGroups={allGroups}
              allPermissions={allPermissions}
              onClose={() => setSelectedUser(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
