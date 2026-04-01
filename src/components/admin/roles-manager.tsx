'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StateDisplay, TableSkeleton } from '@/components/ui/state-display';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
};

type PermissionItem = {
  id: number;
  key: string;
  moduleSlug: string;
  action: string;
  description: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Group sheet (configure permissions)
// ---------------------------------------------------------------------------

function GroupSheet({
  group,
  allPermissions,
  onClose,
}: {
  group: GroupItem;
  allPermissions: PermissionItem[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');

  const initialPermIds = new Set(group.permissions.map((p) => p.permissionId));
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(initialPermIds);

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

  const permsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/groups/${group.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: Array.from(selectedPermIds) }),
      });
      if (!res.ok) throw new Error('Falha ao salvar permissões');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  const handleSave = async () => {
    await updateMutation.mutateAsync();
    await permsMutation.mutateAsync();
  };

  const handlePermToggle = (permId: number, checked: boolean) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permId);
      else next.delete(permId);
      return next;
    });
  };

  const byModule = groupByModule(allPermissions);
  const isSaving = updateMutation.isPending || permsMutation.isPending;

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden">
      <SheetHeader className="border-b px-4 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <SheetTitle>Configurar grupo</SheetTitle>
        </div>
        <SheetDescription>
          Defina o nome, descrição e quais módulos este grupo pode acessar.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Basic info */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Informações do grupo</h3>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Nome</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Analistas de NOC"
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

        {/* Permissions by module */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">O que este grupo pode fazer?</h3>
          {byModule.size === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma permissão disponível.</p>
          ) : (
            <div className="space-y-3">
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
                          checked={selectedPermIds.has(perm.id)}
                          onChange={(e) => handlePermToggle(perm.id, e.target.checked)}
                        />
                        <span>
                          {perm.action === 'read' ? 'Pode visualizar' : 'Pode editar / importar'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="border-t px-4 py-4">
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Salvando...' : 'Salvar configurações do grupo'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RolesManager() {
  const queryClient = useQueryClient();
  const [configuringGroup, setConfiguringGroup] = useState<GroupItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
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
      return res.json() as Promise<{ data: PermissionItem[] }>;
    },
  });

  const groups = groupsData?.data ?? [];
  const allPermissions = permsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao criar grupo');
      return res.json();
    },
    onSuccess: () => {
      setNewName('');
      setNewDescription('');
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
            Agrupe permissões e aplique-as a vários usuários de uma vez. Um usuário pode pertencer a múltiplos grupos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : groups.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              Nenhum grupo criado ainda. Crie o primeiro grupo para começar a organizar permissões.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const permCount = group.permissions.length;
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{group.name}</p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => setDeletingId(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {permCount} {permCount === 1 ? 'permissão' : 'permissões'}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setConfiguringGroup(group)}
                    >
                      Configurar permissões
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) createMutation.mutate();
                }}
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover grupo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Tem certeza que deseja remover este grupo? Os usuários que pertencem a ele perderão as permissões associadas. Esta ação não pode ser desfeita.
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

      {/* Configure sheet */}
      <Sheet
        open={!!configuringGroup}
        onOpenChange={(open) => { if (!open) setConfiguringGroup(null); }}
      >
        <SheetContent side="right" showCloseButton className="w-full sm:max-w-lg p-0">
          {configuringGroup && (
            <GroupSheet
              group={configuringGroup}
              allPermissions={allPermissions}
              onClose={() => setConfiguringGroup(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
