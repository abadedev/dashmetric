'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCog, Layers3, PencilLine, Plus, Save, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StateDisplay, TableSkeleton } from '@/components/ui/state-display';
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
    parameters?: Array<{ excelColumn: string; systemField: string }>;
  }>;
};

type ImportProfileFormState = {
  moduleId: string;
  profileKey: string;
  label: string;
  detectorType: string;
  isActive: boolean;
  parameters: Array<{ excelColumn: string; systemField: string }>;
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
  parameters: [],
};

const iconList = [
  { value: 'LayoutDashboard', label: 'Painel Inicial (Dashboard)' },
  { value: 'ListTodo', label: 'Lista de Tarefas' },
  { value: 'Trophy', label: 'Troféu / Conquista' },
  { value: 'CheckCircle', label: 'Concluído / OK' },
  { value: 'HeadphonesIcon', label: 'Suporte / Atendimento' },
  { value: 'TrendingUp', label: 'Crescimento / Em Alta' },
  { value: 'UserMinus', label: 'Gestão de Usuários' },
  { value: 'Network', label: 'Rede / Integrações' },
  { value: 'BarChart', label: 'Gráfico Simples' },
  { value: 'BarChart3', label: 'Gráfico Detalhado' },
  { value: 'Upload', label: 'Upload / Envio de Arquivos' },
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
          parameters: profileForm.parameters,
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
          parameters: profileForm.parameters,
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
            <CardTitle>Construtor de Páginas</CardTitle>
          </div>
          <CardDescription>
            Crie, ative, desative e organize as páginas que aparecem no menu lateral do seu sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Nome da Página</span>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Link (Endereço)</span>
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
              <span className="text-xs font-medium text-muted-foreground">Caminho de Acesso</span>
              <Input value={derivedHref} readOnly />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Posição no Menu (Ordem)</span>
              <Input value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Ícone no Menu</span>
              <Select value={form.icon} onValueChange={(value) => setForm((prev) => ({ ...prev, icon: value || prev.icon }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconList.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Quem pode acessar?</span>
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
                  <SelectItem value="user">Qualquer Usuário (Básico)</SelectItem>
                  <SelectItem value="editor">Apenas Editores</SelectItem>
                  <SelectItem value="admin">Apenas Administradores</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Copiar visual de outra página?</span>
              <Select
                value={form.templateSource || '__none__'}
                onValueChange={(value) => setForm((prev) => ({ ...prev, templateSource: !value || value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Página em branco</SelectItem>
                  {moduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Resumo / Descrição Interna</span>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Novas páginas usam rota padrão no formato <span className="font-mono text-foreground">/{'{endereço}'}</span>. O campo "Copiar visual de outra página" reaproveita a estrutura da tela, mas não copia seus dados antigos ou tabelas originais de forma automática.
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Página ativa (Online)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.showInSidebar}
                onChange={(e) => setForm((prev) => ({ ...prev, showInSidebar: e.target.checked }))}
              />
              Aparecer no menu lateral
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowImport}
                onChange={(e) => setForm((prev) => ({ ...prev, allowImport: e.target.checked }))}
              />
              Pode receber envios (Uploads)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isEditable}
                onChange={(e) => setForm((prev) => ({ ...prev, isEditable: e.target.checked }))}
              />
              Liberar edição futura
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())} disabled={isSaving}>
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? 'Salvar Modificações' : 'Publicar Nova Página'}
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
          <CardTitle>Páginas Publicadas</CardTitle>
          <CardDescription>
            Veja abaixo todas as páginas criadas no sistema e acesse os atalhos para edição rápida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <StateDisplay variant="error" description="Não foi possível carregar as páginas agora. Aguarde ou atualize a aba." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página / Título</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Acesso Restrito</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Menu Lateral</TableHead>
                  <TableHead>Aceita Upload?</TableHead>
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
            <CardTitle>Configurar Envio de Planilhas (Uploads)</CardTitle>
          </div>
          <CardDescription>
            Se alguma página precisar receber dados via planilha (CSV/Excel), configure aqui como o sistema deve ler esses arquivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Associar à Página</span>
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
                  <SelectItem value="__none__">Selecione uma Página</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={String(module.id)}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Código Interno (Chave)</span>
              <Input
                value={profileForm.profileKey}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, profileKey: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Nome da Planilha no Painel</span>
              <Input
                value={profileForm.label}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Identificador (Detector)</span>
              <Input
                value={profileForm.detectorType}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, detectorType: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </label>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Mapeamento de Colunas (Opcional)</h4>
                <p className="text-xs text-muted-foreground">Relacione as colunas da planilha com os campos do sistema para ler os dados corretamente.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfileForm(prev => ({ ...prev, parameters: [...prev.parameters, { excelColumn: '', systemField: '' }] }))}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Coluna
              </Button>
            </div>
            {profileForm.parameters.length > 0 && (
              <div className="space-y-3">
                {profileForm.parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      placeholder="Nome na Planilha (Ex: Cliente)"
                      value={param.excelColumn}
                      onChange={(e) => {
                        const newParams = [...profileForm.parameters];
                        newParams[index].excelColumn = e.target.value;
                        setProfileForm(prev => ({ ...prev, parameters: newParams }));
                      }}
                    />
                    <Input
                      placeholder="Campo no Sistema (Ex: clientName)"
                      value={param.systemField}
                      onChange={(e) => {
                        const newParams = [...profileForm.parameters];
                        newParams[index].systemField = e.target.value;
                        setProfileForm(prev => ({ ...prev, parameters: newParams }));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProfileForm(prev => ({ ...prev, parameters: prev.parameters.filter((_, i) => i !== index) }));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={profileForm.isActive}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Planilha ativada (Disponível para uso)
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => (editingProfileId ? updateProfileMutation.mutate() : createProfileMutation.mutate())}
              disabled={isSavingProfile || !profileForm.moduleId}
            >
              {editingProfileId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingProfileId ? 'Salvar Configuração' : 'Cadastrar Planilha'}
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
                <TableHead>Página Vinculada</TableHead>
                <TableHead>Código Interno</TableHead>
                <TableHead>Nome Fácil</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Ativo?</TableHead>
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
                              parameters: profile.parameters || [],
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
                    Nenhuma planilha configurada.
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
