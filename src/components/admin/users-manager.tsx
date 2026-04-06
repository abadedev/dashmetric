'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StateDisplay, TableSkeleton } from '@/components/ui/state-display';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type UserGroup = { id: number; name: string };

type UserItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  globalRole: 'user' | 'editor' | 'admin';
  workspaceRole: 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  workspaceGrantedAt: string | null;
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

function globalRoleLabel(role: UserItem['globalRole']) {
  if (role === 'admin') return 'Administrador global';
  if (role === 'editor') return 'Editor global';
  return 'Usuario global';
}

function workspaceRoleLabel(role: UserItem['workspaceRole']) {
  if (role === 'ADMIN') return 'Admin do workspace';
  if (role === 'MEMBER') return 'Membro do workspace';
  if (role === 'VIEWER') return 'Leitor do workspace';
  return 'Sem vinculacao';
}

function humanizeSlug(slug: string) {
  return slug
    .split('.')
    .join(' / ')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupByModule(perms: PermissionItem[]) {
  const map = new Map<string, PermissionItem[]>();
  for (const permission of perms) {
    const list = map.get(permission.moduleSlug) ?? [];
    list.push(permission);
    map.set(permission.moduleSlug, list);
  }
  return map;
}

function UserAvatar({ user }: { user: UserItem }) {
  if (user.image) {
    return <img src={user.image} alt={user.name} className="h-9 w-9 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function UserSheet({
  user,
  allGroups,
  allPermissions,
}: {
  user: UserItem;
  allGroups: GroupItem[];
  allPermissions: PermissionItem[];
}) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const isPlatformAdmin = (sessionData?.user as { role?: string } | undefined)?.role === 'admin';

  const [globalRole, setGlobalRole] = useState<UserItem['globalRole']>(user.globalRole);
  const [workspaceRole, setWorkspaceRole] = useState<UserItem['workspaceRole']>(user.workspaceRole);
  const [userGroupIds, setUserGroupIds] = useState<Set<number>>(new Set(user.groups.map((group) => group.id)));
  const [localPermIds, setLocalPermIds] = useState<Set<number> | null>(null);

  const { data: indivData } = useQuery({
    queryKey: ['user-individual-permissions', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`);
      if (!res.ok) throw new Error('Falha ao carregar permissoes individuais');
      const json = await res.json() as { data: PermissionItem[] };
      return json.data;
    },
  });

  const effectivePermIds = localPermIds ?? new Set(indivData?.map((permission) => permission.id) ?? []);

  const roleMutation = useMutation({
    mutationFn: async (payload: Partial<Pick<UserItem, 'globalRole' | 'workspaceRole'>>) => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falha ao atualizar papeis');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const permsMutation = useMutation({
    mutationFn: async (permissionIds: number[]) => {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds }),
      });
      if (!res.ok) throw new Error('Falha ao salvar permissoes individuais');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-individual-permissions', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const byModule = useMemo(() => groupByModule(allPermissions), [allPermissions]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SheetHeader className="border-b px-4 pb-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div>
            <SheetTitle>{user.name}</SheetTitle>
            <SheetDescription>{user.email}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Papel global</h3>
          {isPlatformAdmin ? (
            <div className="flex items-center gap-3">
              <Select
                value={globalRole}
                onValueChange={(value) => {
                  const nextRole = value as UserItem['globalRole'];
                  setGlobalRole(nextRole);
                  roleMutation.mutate({ globalRole: nextRole });
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario global</SelectItem>
                  <SelectItem value="editor">Editor global</SelectItem>
                  <SelectItem value="admin">Administrador global</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">{globalRoleLabel(globalRole)}</Badge>
            </div>
          ) : (
            <Badge variant="secondary">{globalRoleLabel(globalRole)}</Badge>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Papel no workspace ativo</h3>
          {workspaceRole ? (
            <div className="flex items-center gap-3">
              <Select
                value={workspaceRole}
                onValueChange={(value) => {
                  const nextRole = value as Exclude<UserItem['workspaceRole'], null>;
                  setWorkspaceRole(nextRole);
                  roleMutation.mutate({ workspaceRole: nextRole });
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin do workspace</SelectItem>
                  <SelectItem value="MEMBER">Membro do workspace</SelectItem>
                  <SelectItem value="VIEWER">Leitor do workspace</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">{workspaceRoleLabel(workspaceRole)}</Badge>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Este usuario ainda nao esta vinculado ao workspace ativo. O papel pode ser atribuido na area de membros do workspace.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Grupos do workspace</h3>
          {workspaceRole === null ? (
            <p className="text-xs text-muted-foreground">Somente membros do workspace podem receber grupos.</p>
          ) : allGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum grupo cadastrado neste workspace.</p>
          ) : (
            <div className="space-y-2">
              {allGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={userGroupIds.has(group.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setUserGroupIds((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(group.id);
                          groupAddMutation.mutate(group.id);
                        } else {
                          next.delete(group.id);
                          groupRemoveMutation.mutate(group.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <div>
                    <span className="font-medium">{group.name}</span>
                    {group.description ? <p className="text-xs text-muted-foreground">{group.description}</p> : null}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Permissoes extras do workspace</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Essas permissoes se somam aos grupos do workspace e nao afetam outros workspaces.
            </p>
          </div>

          {workspaceRole === null ? (
            <p className="text-xs text-muted-foreground">Somente membros do workspace podem receber permissoes extras.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(byModule.entries()).map(([slug, perms]) => (
                <div key={slug} className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold">{humanizeSlug(slug)}</p>
                  <div className="space-y-1.5">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={effectivePermIds.has(perm.id)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setLocalPermIds((prev) => {
                              const base = prev ?? new Set(indivData?.map((permission) => permission.id) ?? []);
                              const next = new Set(base);
                              if (checked) next.add(perm.id);
                              else next.delete(perm.id);
                              return next;
                            });
                          }}
                        />
                        <span>{perm.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            size="sm"
            disabled={workspaceRole === null || permsMutation.isPending}
            onClick={() => permsMutation.mutate(Array.from(effectivePermIds))}
          >
            {permsMutation.isPending ? 'Salvando...' : 'Salvar permissoes extras'}
          </Button>
        </section>
      </div>
    </div>
  );
}

export function UsersManager() {
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Falha ao carregar usuarios');
      return res.json() as Promise<{ data: UserItem[] }>;
    },
  });

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/permissions');
      if (!res.ok) throw new Error('Falha ao carregar permissoes');
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
            <CardTitle>Membros e acessos</CardTitle>
          </div>
          <CardDescription>
            Cada linha mostra o papel global separado do papel, grupos e permissoes extras do workspace ativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <TableSkeleton />
          ) : usersError ? (
            <StateDisplay
              variant="empty"
              title="Nao foi possivel carregar os usuarios"
              description="Revise a autorizacao do workspace ativo."
            />
          ) : users.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">Nenhum usuario encontrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 py-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {globalRoleLabel(user.globalRole)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {workspaceRoleLabel(user.workspaceRole)}
                      </Badge>
                      {user.groups.map((group) => (
                        <Badge key={group.id} variant="outline" className="text-[10px]">
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                    Gerenciar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <SheetContent side="right" showCloseButton className="w-full p-0 sm:max-w-lg">
          {selectedUser ? (
            <UserSheet user={selectedUser} allGroups={allGroups} allPermissions={allPermissions} />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
