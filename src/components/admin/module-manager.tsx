'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCog, Layers3, PencilLine, Plus, Save, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

type ModuleItem = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
  showInSidebar: boolean;
  allowImport: boolean;
  requiredRole: 'user' | 'editor' | 'admin';
  templateSource: string | null;
  isEditable: boolean;
  importProfiles?: Array<{
    id: number;
    moduleId?: number;
    profileKey?: string;
    label: string;
    detectorType: string;
    isActive: boolean;
  }>;
};

type ImportProfileFormState = {
  moduleId: string;
  profileKey: string;
  label: string;
  detectorType: string;
  isActive: boolean;
};

type ModuleFormState = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  href: string;
  sortOrder: string;
  isActive: boolean;
  showInSidebar: boolean;
  allowImport: boolean;
  requiredRole: 'user' | 'editor' | 'admin';
  templateSource: string;
  isEditable: boolean;
};

const defaultForm: ModuleFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'LayoutDashboard',
  href: '',
  sortOrder: '100',
  isActive: true,
  showInSidebar: true,
  allowImport: false,
  requiredRole: 'user',
  templateSource: '',
  isEditable: true,
};

const defaultProfileForm: ImportProfileFormState = {
  moduleId: '',
  profileKey: '',
  label: '',
  detectorType: '',
  isActive: true,
};

const iconOptions = [
  'LayoutDashboard',
  'ListTodo',
  'Trophy',
  'CheckCircle',
  'HeadphonesIcon',
  'TrendingUp',
  'UserMinus',
  'Network',
  'BarChart',
  'BarChart3',
  'Upload',
];

function slugToHref(slug: string) {
  return `/${slug.trim().replace(/^\/+/, '')}`;
}

export function ModuleManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ModuleFormState>(defaultForm);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<ImportProfileFormState>(defaultProfileForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const response = await fetch('/api/modules');
      if (!response.ok) {
        throw new Error('Falha ao carregar módulos');
      }

      return response.json() as Promise<{ data: ModuleItem[] }>;
    },
  });

  const modules = data?.data ?? [];
  const flattenedProfiles = modules.flatMap((module) =>
    (module.importProfiles ?? []).map((profile) => ({
      ...profile,
      moduleId: module.id,
      moduleName: module.name,
      profileKey: profile.profileKey ?? '',
    }))
  );

  const moduleOptions = useMemo(
    () => modules.map((module) => ({ value: module.slug, label: module.name })),
    [modules]
  );

  const overview = useMemo(
    () => ({
      totalModules: modules.length,
      activeModules: modules.filter((module) => module.isActive).length,
      importEnabled: modules.filter((module) => module.allowImport).length,
      totalProfiles: flattenedProfiles.length,
    }),
    [flattenedProfiles.length, modules]
  );

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-modules'] }),
      queryClient.invalidateQueries({ queryKey: ['sidebar-modules'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sortOrder: Number(form.sortOrder || 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível criar o módulo');
      }

      return response.json();
    },
    onSuccess: async () => {
      setForm(defaultForm);
      await refreshQueries();
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/module-import-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: Number(profileForm.moduleId),
          profileKey: profileForm.profileKey,
          label: profileForm.label,
          detectorType: profileForm.detectorType,
          isActive: profileForm.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível criar o perfil de importação');
      }

      return response.json();
    },
    onSuccess: async () => {
      setProfileForm(defaultProfileForm);
      await refreshQueries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return null;

      const response = await fetch(`/api/modules/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sortOrder: Number(form.sortOrder || 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível atualizar o módulo');
      }

      return response.json();
    },
    onSuccess: async () => {
      setEditingId(null);
      setForm(defaultForm);
      await refreshQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/modules/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Não foi possível remover o módulo');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refreshQueries();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!editingProfileId) return null;

      const response = await fetch(`/api/module-import-profiles/${editingProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: Number(profileForm.moduleId),
          profileKey: profileForm.profileKey,
          label: profileForm.label,
          detectorType: profileForm.detectorType,
          isActive: profileForm.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível atualizar o perfil de importação');
      }

      return response.json();
    },
    onSuccess: async () => {
      setEditingProfileId(null);
      setProfileForm(defaultProfileForm);
      await refreshQueries();
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/module-import-profiles/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Não foi possível remover o perfil de importação');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refreshQueries();
    },
  });

  const handleEdit = (module: ModuleItem) => {
    setEditingId(module.id);
    setForm({
      name: module.name,
      slug: module.slug,
      description: module.description ?? '',
      icon: module.icon,
      href: module.href,
      sortOrder: String(module.sortOrder),
      isActive: module.isActive,
      showInSidebar: module.showInSidebar,
      allowImport: module.allowImport,
      requiredRole: module.requiredRole,
      templateSource: module.templateSource ?? '',
      isEditable: module.isEditable,
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSavingProfile = createProfileMutation.isPending || updateProfileMutation.isPending;
  const derivedHref = form.slug ? slugToHref(form.slug) : '/seu-modulo';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Layers3 className="h-5 w-5" />
            <CardTitle>Gerenciar módulos</CardTitle>
          </div>
          <CardDescription>
            Cadastre, ative, desative e ordene os setores que aparecem no menu lateral e que poderão receber dashboards próprios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Nome</span>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Slug</span>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''),
                  }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Rota gerada</span>
              <Input value={derivedHref} readOnly />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Ordem</span>
              <Input value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Ícone</span>
              <Select value={form.icon} onValueChange={(value) => setForm((prev) => ({ ...prev, icon: value || prev.icon }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Role mínima</span>
              <Select
                value={form.requiredRole}
                onValueChange={(value) => {
                  if (!value) return;
                  setForm((prev) => ({ ...prev, requiredRole: value as ModuleFormState['requiredRole'] }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Clonar base visual</span>
              <Select
                value={form.templateSource || '__none__'}
                onValueChange={(value) => setForm((prev) => ({ ...prev, templateSource: !value || value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem base</SelectItem>
                  {moduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Descrição</span>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Novos módulos usam rota padrão no formato <span className="font-mono text-foreground">/{'{slug}'}</span> para manter compatibilidade com a navegação dinâmica.
            O campo "Clonar base visual" reaproveita a base estrutural do módulo de origem, mas não copia automaticamente dashboards e regras de negócio.
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Módulo ativo
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.showInSidebar}
                onChange={(e) => setForm((prev) => ({ ...prev, showInSidebar: e.target.checked }))}
              />
              Exibir no menu
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowImport}
                onChange={(e) => setForm((prev) => ({ ...prev, allowImport: e.target.checked }))}
              />
              Aceita importação
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isEditable}
                onChange={(e) => setForm((prev) => ({ ...prev, isEditable: e.target.checked }))}
              />
              Editável no admin
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())} disabled={isSaving}>
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? 'Salvar alterações' : 'Criar módulo'}
            </Button>
            {editingId ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                }}
              >
                Cancelar edição
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos cadastrados</CardTitle>
          <CardDescription>
            A tabela abaixo já serve de base para a navegação dinâmica e para os próximos módulos de negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Carregando módulos...</div>
          ) : error ? (
            <div className="py-6 text-sm text-amber-600">
              Não foi possível carregar os módulos agora. Se a migration nova ainda não foi aplicada, este comportamento é esperado nesta etapa.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead>Importa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{module.name}</div>
                      <div className="text-xs text-muted-foreground">{module.slug}</div>
                      {module.importProfiles?.length ? (
                        <div className="mt-2 space-y-1">
                          {module.importProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              className="rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">{profile.label}</span>
                              <span className="ml-2">({profile.detectorType})</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{module.href}</TableCell>
                    <TableCell>{module.requiredRole}</TableCell>
                    <TableCell>{module.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell>{module.showInSidebar ? 'Visível' : 'Oculto'}</TableCell>
                    <TableCell>{module.allowImport ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(module)}>
                          <PencilLine className="h-4 w-4" />
                          Editar
                        </Button>
                        {module.isEditable ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(module.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileCog className="h-5 w-5" />
            <CardTitle>Perfis de importação</CardTitle>
          </div>
          <CardDescription>
            Defina quais perfis de arquivo pertencem a cada módulo e mantenha a importação documentada dentro do painel administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Módulo</span>
              <Select
                value={profileForm.moduleId || '__none__'}
                onValueChange={(value) =>
                  setProfileForm((prev) => ({ ...prev, moduleId: !value || value === '__none__' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={String(module.id)}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Chave</span>
              <Input
                value={profileForm.profileKey}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, profileKey: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Rótulo</span>
              <Input
                value={profileForm.label}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Detector</span>
              <Input
                value={profileForm.detectorType}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, detectorType: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </label>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={profileForm.isActive}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Perfil ativo
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => (editingProfileId ? updateProfileMutation.mutate() : createProfileMutation.mutate())}
              disabled={isSavingProfile || !profileForm.moduleId}
            >
              {editingProfileId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingProfileId ? 'Salvar perfil' : 'Criar perfil'}
            </Button>
            {editingProfileId ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProfileId(null);
                  setProfileForm(defaultProfileForm);
                }}
              >
                Cancelar edição
              </Button>
            ) : null}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Rótulo</TableHead>
                <TableHead>Detector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedProfiles.length ? (
                flattenedProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.moduleName}</TableCell>
                    <TableCell>{profile.profileKey}</TableCell>
                    <TableCell>{profile.label}</TableCell>
                    <TableCell>{profile.detectorType}</TableCell>
                    <TableCell>{profile.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProfileId(profile.id);
                            setProfileForm({
                              moduleId: String(profile.moduleId),
                              profileKey: profile.profileKey,
                              label: profile.label,
                              detectorType: profile.detectorType,
                              isActive: profile.isActive,
                            });
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteProfileMutation.mutate(profile.id)}
                          disabled={deleteProfileMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum perfil de importação cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
