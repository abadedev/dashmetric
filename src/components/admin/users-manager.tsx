'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, UserCog, Users } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  humanizeModuleAccessLevel,
  MODULE_ACCESS_LEVELS,
  resolveModuleAccessMapFromKeys,
  type ModuleAccessLevel,
} from '@/lib/module-access';

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

type ModuleCatalogItem = {
  slug: string;
  name: string;
  description: string | null;
};

type PermissionsResponse = {
  data: PermissionItem[];
  modules: ModuleCatalogItem[];
  globalPermissions: PermissionItem[];
};

function globalRoleLabel(role: UserItem['globalRole']) {
  if (role === 'admin') return 'Administrador global';
  if (role === 'editor') return 'Editor global';
  return 'Usuário global';
}

function workspaceRoleLabel(role: UserItem['workspaceRole']) {
  if (role === 'ADMIN') return 'Admin do workspace';
  if (role === 'MEMBER') return 'Membro do workspace';
  if (role === 'VIEWER') return 'Leitor do workspace';
  return 'Sem vinculação';
}

function UserAvatar({ user, size = 'md' }: { user: UserItem; size?: 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';

  if (user.image) {
    return <img src={user.image} alt={user.name} className={`${dimensions} rounded-2xl object-cover`} />;
  }

  return (
    <div className={`flex ${dimensions} items-center justify-center rounded-2xl bg-muted text-center font-semibold text-muted-foreground`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ModuleAccessSelector({
  value,
  onChange,
}: {
  value: ModuleAccessLevel;
  onChange: (value: ModuleAccessLevel) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MODULE_ACCESS_LEVELS.map((level) => (
        <Button
          key={level}
          type="button"
          variant={value === level ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(level)}
          className="justify-center"
        >
          {humanizeModuleAccessLevel(level)}
        </Button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function UserAccessDialog({
  user,
  open,
  onClose,
  allGroups,
  modules,
  globalPermissions,
}: {
  user: UserItem | null;
  open: boolean;
  onClose: () => void;
  allGroups: GroupItem[];
  modules: ModuleCatalogItem[];
  globalPermissions: PermissionItem[];
}) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const isPlatformAdmin = (sessionData?.user as { role?: string } | undefined)?.role === 'admin';

  const { data: indivData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-individual-permissions', user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${user!.id}/permissions`);
      if (!res.ok) throw new Error('Falha ao carregar permissões individuais');
      return res.json() as Promise<{
        data: PermissionItem[];
        moduleAccess?: Record<string, ModuleAccessLevel>;
        globalPermissions?: PermissionItem[];
      }>;
    },
  });

  const [globalRole, setGlobalRole] = useState<UserItem['globalRole']>('user');
  const [workspaceRole, setWorkspaceRole] = useState<UserItem['workspaceRole']>(null);
  const [userGroupIds, setUserGroupIds] = useState<Set<number>>(new Set());
  const [moduleAccess, setModuleAccess] = useState<Record<string, ModuleAccessLevel>>({});
  const [globalPermissionIds, setGlobalPermissionIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user || !open) return;

    setGlobalRole(user.globalRole);
    setWorkspaceRole(user.workspaceRole);
    setUserGroupIds(new Set(user.groups.map((group) => group.id)));
  }, [open, user]);

  useEffect(() => {
    if (!user || !open) return;

    const fromLegacy = resolveModuleAccessMapFromKeys(
      (indivData?.data ?? []).map((permission) => permission.key).filter((key) => !key.startsWith('admin.'))
    );

    const nextModuleAccess = Object.fromEntries(
      modules.map((module) => [
        module.slug,
        indivData?.moduleAccess?.[module.slug] ?? fromLegacy[module.slug] ?? 'none',
      ])
    ) as Record<string, ModuleAccessLevel>;

    setModuleAccess(nextModuleAccess);
    setGlobalPermissionIds(new Set((indivData?.globalPermissions ?? []).map((permission) => permission.id)));
  }, [indivData?.data, indivData?.globalPermissions, indivData?.moduleAccess, modules, open, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return null;

      const requests: Promise<Response>[] = [];
      const initialGroupIds = new Set(user.groups.map((group) => group.id));
      const groupsToAdd = [...userGroupIds].filter((groupId) => !initialGroupIds.has(groupId));
      const groupsToRemove = [...initialGroupIds].filter((groupId) => !userGroupIds.has(groupId));

      if (globalRole !== user.globalRole || workspaceRole !== user.workspaceRole) {
        requests.push(
          fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ globalRole, workspaceRole }),
          })
        );
      }

      for (const groupId of groupsToAdd) {
        requests.push(
          fetch(`/api/admin/users/${user.id}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId }),
          })
        );
      }

      for (const groupId of groupsToRemove) {
        requests.push(
          fetch(`/api/admin/users/${user.id}/groups`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId }),
          })
        );
      }

      requests.push(
        fetch(`/api/admin/users/${user.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleAccess,
            globalPermissionIds: Array.from(globalPermissionIds),
          }),
        })
      );

      const responses = await Promise.all(requests);
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        throw new Error('Falha ao salvar alterações do usuário.');
      }
    },
    onSuccess: async () => {
      if (!user) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-individual-permissions', user.id] }),
      ]);
      onClose();
    },
  });

  if (!user) return null;

  const visibleGroups = user.groups.slice(0, 3);
  const remainingGroups = Math.max(0, user.groups.length - visibleGroups.length);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent showCloseButton className="max-h-[92vh] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-3xl border border-border/80 bg-background p-0 sm:max-w-4xl xl:max-w-5xl">
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b border-border/80 px-6 py-5">
            <div className="flex items-start gap-4 pr-10">
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl">{user.name}</DialogTitle>
                <DialogDescription className="truncate">{user.email}</DialogDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={user.globalRole === 'admin' ? 'default' : 'secondary'}>
                    {globalRoleLabel(user.globalRole)}
                  </Badge>
                  <Badge variant="outline">{workspaceRoleLabel(user.workspaceRole)}</Badge>
                  {visibleGroups.map((group) => (
                    <Badge key={group.id} variant="outline" className="max-w-[180px] truncate">
                      {group.name}
                    </Badge>
                  ))}
                  {remainingGroups > 0 ? (
                    <Badge variant="outline">+{remainingGroups} grupos</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <SectionCard title="Dados do usuário" description="Resumo principal para identificar rapidamente quem está sendo configurado.">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[220px] flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome</p>
                  <p className="mt-1 text-sm font-medium">{user.name}</p>
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm font-medium">{user.email}</p>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Papel global" description="Controla o papel do usuário na plataforma inteira.">
                {isPlatformAdmin ? (
                  <div className="space-y-3">
                    <Select value={globalRole} onValueChange={(value) => setGlobalRole((value ?? 'user') as UserItem['globalRole'])}>
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário global</SelectItem>
                        <SelectItem value="editor">Editor global</SelectItem>
                        <SelectItem value="admin">Administrador global</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">{globalRoleLabel(globalRole)}</Badge>
                  </div>
                ) : (
                  <Badge variant="secondary">{globalRoleLabel(globalRole)}</Badge>
                )}
              </SectionCard>

              <SectionCard title="Papel no workspace ativo" description="Define o nível de vínculo do usuário no workspace atual.">
                {workspaceRole ? (
                  <div className="space-y-3">
                    <Select
                      value={workspaceRole}
                      onValueChange={(value) => setWorkspaceRole((value ?? 'MEMBER') as Exclude<UserItem['workspaceRole'], null>)}
                    >
                      <SelectTrigger className="w-full sm:w-64">
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
                  <p className="text-sm text-muted-foreground">
                    Este usuário ainda não está vinculado ao workspace ativo.
                  </p>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Grupos do workspace" description="Os grupos definem o acesso herdado base do usuário neste workspace.">
              {workspaceRole === null ? (
                <p className="text-sm text-muted-foreground">Somente membros do workspace podem receber grupos.</p>
              ) : allGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado neste workspace.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {allGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={userGroupIds.has(group.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setUserGroupIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(group.id);
                            else next.delete(group.id);
                            return next;
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{group.name}</p>
                        {group.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Permissões extras do workspace" description="Essas configurações sobrescrevem ou complementam os grupos para este usuário.">
              {workspaceRole === null ? (
                <p className="text-sm text-muted-foreground">Somente membros do workspace podem receber permissões extras.</p>
              ) : permissionsLoading ? (
                <TableSkeleton />
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold">Acesso por módulo</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Viewer visualiza. Editor cria, edita, compartilha, finaliza e exporta. Admin também importa e exclui.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {modules.map((module) => (
                        <div key={module.slug} className="rounded-2xl border border-border/80 bg-background/70 px-4 py-4">
                          <div className="mb-3">
                            <p className="text-sm font-semibold">{module.name}</p>
                            {module.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                            ) : null}
                          </div>
                          <ModuleAccessSelector
                            value={moduleAccess[module.slug] ?? 'none'}
                            onChange={(value) =>
                              setModuleAccess((current) => ({
                                ...current,
                                [module.slug]: value,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold">Permissões globais extras</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Permissões administrativas separadas do nível dos módulos.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {globalPermissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3 transition-colors hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={globalPermissionIds.has(permission.id)}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setGlobalPermissionIds((current) => {
                                const next = new Set(current);
                                if (checked) next.add(permission.id);
                                else next.delete(permission.id);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{permission.key}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{permission.description ?? permission.key}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <DialogFooter className="mt-0 border-t border-border/80 bg-background/95 px-6 py-4 backdrop-blur">
            <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || permissionsLoading}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserCard({
  user,
  onOpen,
}: {
  user: UserItem;
  onOpen: () => void;
}) {
  const visibleGroups = user.groups.slice(0, 3);
  const remainingGroups = Math.max(0, user.groups.length - visibleGroups.length);
  const isAdminCard = user.globalRole === 'admin' || user.workspaceRole === 'ADMIN';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className="group w-full cursor-pointer rounded-3xl border border-border/80 bg-card/80 p-0 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              {isAdminCard ? (
                <Badge variant="default" className="shrink-0">
                  Destaque
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Papéis</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={user.globalRole === 'admin' ? 'default' : 'secondary'}>
                {globalRoleLabel(user.globalRole)}
              </Badge>
              <Badge variant="outline">{workspaceRoleLabel(user.workspaceRole)}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Grupos do workspace</p>
            <div className="flex min-h-8 flex-wrap gap-2">
              {visibleGroups.length > 0 ? (
                <>
                  {visibleGroups.map((group) => (
                    <Badge key={group.id} variant="outline" className="max-w-[180px] truncate">
                      {group.name}
                    </Badge>
                  ))}
                  {remainingGroups > 0 ? <Badge variant="outline">+{remainingGroups} grupos</Badge> : null}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sem grupos vinculados</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            Clique para abrir a configuração
          </span>
          <Button variant="outline" size="sm" className="pointer-events-none">
            Gerenciar permissões
          </Button>
        </div>
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
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      return res.json() as Promise<{ data: UserItem[] }>;
    },
  });

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/permissions');
      if (!res.ok) throw new Error('Falha ao carregar permissões');
      return res.json() as Promise<PermissionsResponse>;
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
  const modules = permsData?.modules ?? [];
  const globalPermissions = permsData?.globalPermissions ?? [];
  const allGroups = groupsData?.data ?? [];
  const adminCount = users.filter((user) => user.globalRole === 'admin' || user.workspaceRole === 'ADMIN').length;

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <UserCog className="h-5 w-5" />
                <CardTitle>Membros e acessos</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Painel visual de gestão de acessos por usuário, com papéis, grupos e permissões extras do workspace.
              </CardDescription>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Usuários</p>
                <p className="mt-2 text-2xl font-semibold">{users.length}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Admins</p>
                <p className="mt-2 text-2xl font-semibold">{adminCount}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {usersLoading ? (
            <TableSkeleton />
          ) : usersError ? (
            <StateDisplay
              variant="empty"
              title="Não foi possível carregar os usuários"
              description="Revise a autorização do workspace ativo."
            />
          ) : users.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {users.map((user) => (
                <UserCard key={user.id} user={user} onOpen={() => setSelectedUser(user)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserAccessDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        allGroups={allGroups}
        modules={modules}
        globalPermissions={globalPermissions}
      />
    </>
  );
}
