'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/state-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  humanizeModuleAccessLevel,
  MODULE_ACCESS_LEVELS,
  resolveModuleAccessMapFromKeys,
  type ModuleAccessLevel,
} from '@/lib/module-access';
import {
  buildRolePresets,
  getRolePresetByKey,
} from '@/lib/role-presets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PermissionSummary = {
  groupId: number;
  permissionId: number;
  key: string;
  moduleSlug: string;
  action: string;
};

type GroupItem = {
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionSummary[];
  moduleAccess?: Record<string, ModuleAccessLevel>;
};

type PermissionItem = {
  id: number;
  key: string;
  moduleSlug: string;
  action: string;
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

function isGlobalPermission(permission: { moduleSlug: string }) {
  return permission.moduleSlug.startsWith('admin.');
}

function summarizeModuleAccess(moduleAccess: Record<string, ModuleAccessLevel>) {
  const counts = {
    viewer: 0,
    editor: 0,
    admin: 0,
  };

  for (const level of Object.values(moduleAccess)) {
    if (level === 'viewer' || level === 'editor' || level === 'admin') {
      counts[level] += 1;
    }
  }

  return counts;
}

function describeGlobalPermission(permission: PermissionItem) {
  return permission.description?.trim() || permission.key;
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

function GroupSheet({
  group,
  modules,
  globalPermissions,
}: {
  group: GroupItem;
  modules: ModuleCatalogItem[];
  globalPermissions: PermissionItem[];
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const presets = useMemo(() => buildRolePresets(modules, globalPermissions), [modules, globalPermissions]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('custom');

  const initialModuleAccess = useMemo(() => {
    const fromLegacy = resolveModuleAccessMapFromKeys(
      group.permissions.map((permission) => permission.key).filter((key) => !key.startsWith('admin.'))
    );

    return Object.fromEntries(
      modules.map((module) => [
        module.slug,
        group.moduleAccess?.[module.slug] ?? fromLegacy[module.slug] ?? 'none',
      ])
    ) as Record<string, ModuleAccessLevel>;
  }, [group.moduleAccess, group.permissions, modules]);

  const [moduleAccess, setModuleAccess] = useState<Record<string, ModuleAccessLevel>>(initialModuleAccess);
  const initialGlobalPermIds = new Set(
    group.permissions.filter((permission) => isGlobalPermission(permission)).map((permission) => permission.permissionId)
  );
  const [selectedGlobalPermIds, setSelectedGlobalPermIds] = useState<Set<number>>(initialGlobalPermIds);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar grupo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  const accessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/groups/${group.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleAccess,
          globalPermissionIds: Array.from(selectedGlobalPermIds),
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar acessos');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  const isSaving = updateMutation.isPending || accessMutation.isPending;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SheetHeader className="border-b px-4 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <SheetTitle>Configurar grupo</SheetTitle>
        </div>
        <SheetDescription>
          Defina o nome do grupo, o nível de acesso por módulo e as permissões globais administrativas.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Informações do grupo</h3>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Nome</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Coordenadores de Infraestrutura"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Descrição</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Acesso por módulo</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              `Viewer` só visualiza. `Editor` cria, edita, compartilha, finaliza e exporta. `Admin` também importa e exclui.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Aplicar preset</span>
                <Select value={selectedPresetKey} onValueChange={(value) => setSelectedPresetKey(value ?? 'custom')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <p className="text-xs text-muted-foreground">
                {getRolePresetByKey(presets, selectedPresetKey)?.description}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const preset = getRolePresetByKey(presets, selectedPresetKey);
                  if (!preset) return;
                  setModuleAccess({ ...preset.moduleAccess });
                  setSelectedGlobalPermIds(new Set(preset.globalPermissionIds));
                }}
              >
                Aplicar preset
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {modules.map((module) => (
              <div key={module.slug} className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-foreground">{module.name}</p>
                  {module.description ? (
                    <p className="text-xs text-muted-foreground">{module.description}</p>
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
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Permissões globais</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Essas permissões administrativas continuam separadas do nível de acesso dos módulos.
            </p>
          </div>

          {globalPermissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma permissão global disponível.</p>
          ) : (
            <div className="space-y-2">
              {globalPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedGlobalPermIds.has(permission.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelectedGlobalPermIds((current) => {
                        const next = new Set(current);
                        if (checked) next.add(permission.id);
                        else next.delete(permission.id);
                        return next;
                      });
                    }}
                  />
                  <div>
                    <span className="font-medium">{permission.key}</span>
                    <p className="text-xs text-muted-foreground">{describeGlobalPermission(permission)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="border-t px-4 py-4">
        <Button
          className="w-full"
          disabled={isSaving}
          onClick={async () => {
            await updateMutation.mutateAsync();
            await accessMutation.mutateAsync();
          }}
        >
          {isSaving ? 'Salvando...' : 'Salvar configurações do grupo'}
        </Button>
      </div>
    </div>
  );
}

export function RolesManager() {
  const queryClient = useQueryClient();
  const [configuringGroup, setConfiguringGroup] = useState<GroupItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPresetKey, setNewPresetKey] = useState('custom');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/groups');
      if (!res.ok) throw new Error('Falha ao carregar grupos');
      return res.json() as Promise<{ data: GroupItem[] }>;
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

  const groups = groupsData?.data ?? [];
  const modules = permsData?.modules ?? [];
  const globalPermissions = permsData?.globalPermissions ?? [];
  const presets = useMemo(() => buildRolePresets(modules, globalPermissions), [modules, globalPermissions]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao criar grupo');
      const created = await res.json() as { data: { id: number } };
      const preset = getRolePresetByKey(presets, newPresetKey);

      if (preset && created.data?.id) {
        const accessRes = await fetch(`/api/admin/groups/${created.data.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleAccess: preset.moduleAccess,
            globalPermissionIds: preset.globalPermissionIds,
          }),
        });

        if (!accessRes.ok) {
          throw new Error('Grupo criado, mas falhou ao aplicar o preset inicial');
        }
      }

      return created;
    },
    onSuccess: () => {
      setNewName('');
      setNewDescription('');
      setNewPresetKey('custom');
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover grupo');
      return res.json();
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <CardTitle>Grupos de acesso</CardTitle>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Criar novo grupo
            </Button>
          </div>
          <CardDescription>
            Cada módulo agora usa apenas um nível de acesso: `Sem acesso`, `Visualizador`, `Editor` ou `Admin`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : groups.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              Nenhum grupo criado ainda. Crie o primeiro grupo para começar a organizar acessos.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const fallbackAccess = resolveModuleAccessMapFromKeys(
                  group.permissions.map((permission) => permission.key).filter((key) => !key.startsWith('admin.'))
                );
                const moduleAccess = group.moduleAccess ?? fallbackAccess;
                const summary = summarizeModuleAccess(moduleAccess);
                const globalCount = group.permissions.filter((permission) => isGlobalPermission(permission)).length;

                return (
                  <div
                    key={group.id}
                    className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{group.name}</p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>
                      {group.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {summary.viewer} visualizador
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {summary.editor} editor
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {summary.admin} admin
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {globalCount} global
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setConfiguringGroup(group)}
                    >
                      Configurar acessos
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Nome do grupo</span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Analistas, Supervisores..."
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Descrição (opcional)</span>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Para que serve este grupo?"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Preset inicial do cargo</span>
              <Select value={newPresetKey} onValueChange={(value) => setNewPresetKey(value ?? 'custom')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {getRolePresetByKey(presets, newPresetKey)?.description}
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover grupo</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Tem certeza que deseja remover este grupo? Os usuários que pertencem a ele perderão os acessos associados.
          </p>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!configuringGroup}
        onOpenChange={(open) => { if (!open) setConfiguringGroup(null); }}
      >
        <SheetContent side="right" showCloseButton className="w-full p-0 sm:max-w-2xl">
          {configuringGroup ? (
            <GroupSheet
              group={configuringGroup}
              modules={modules}
              globalPermissions={globalPermissions}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
