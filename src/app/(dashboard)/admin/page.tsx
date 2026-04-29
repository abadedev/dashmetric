'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, Layers3, MessageSquare, Shield, ShieldAlert, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';
import { ModuleManager } from '@/components/admin/module-manager';
import { UsersManager } from '@/components/admin/users-manager';
import { RolesManager } from '@/components/admin/roles-manager';
import { WorkspaceManager } from '@/components/admin/workspace-manager';
import { PendingUsersManager, usePendingUsersCount } from '@/components/admin/pending-users-manager';
import { DataCleanupManager } from '@/components/admin/data-cleanup-manager';
import { DropdownOptionsManager } from '@/components/admin/dropdown-options-manager';
import { FeedbackManager } from '@/components/admin/feedback-manager';

function readActiveWorkspaceCookie() {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((item) => item.startsWith('dwm_active_workspace='));

  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

export default function AdminPage() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [activeWorkspaceSlug, setActiveWorkspaceSlug] = useState<string | null>(null);
  const user = data?.user as { name?: string; role?: string } | undefined;
  const isPlatformAdmin = user?.role === 'admin';

  useEffect(() => {
    setActiveWorkspaceSlug(readActiveWorkspaceCookie());
  }, []);

  const { data: workspaceData } = useQuery({
    queryKey: ['my-workspaces', 'admin-page'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces/my');
      if (!res.ok) throw new Error('Falha ao carregar workspaces');
      return res.json() as Promise<{
        data: Array<{ id: string; name: string; slug: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' }>;
      }>;
    },
    enabled: !isPending && Boolean(data?.user),
  });

  const { data: moduleAccessData, isLoading: isModuleAccessLoading } = useQuery({
    queryKey: ['me-module-access', 'admin-page'],
    queryFn: async () => {
      const res = await fetch('/api/me/module-access');
      if (!res.ok) return null;
      return res.json() as Promise<{
        data: { globalRole: string; workspaceRole: string | null; moduleAccess: Record<string, string> };
      }>;
    },
    enabled: !isPending && Boolean(data?.user),
  });

  const activeWorkspace = useMemo(() => {
    const workspaces = workspaceData?.data ?? [];
    if (workspaces.length === 0) return null;
    if (activeWorkspaceSlug) {
      return workspaces.find((workspace) => workspace.slug === activeWorkspaceSlug) ?? workspaces[0] ?? null;
    }
    return workspaces[0] ?? null;
  }, [activeWorkspaceSlug, workspaceData?.data]);

  const moduleAccess = moduleAccessData?.data?.moduleAccess ?? {};
  const canManageDropdowns = isPlatformAdmin ||
    activeWorkspace?.role === 'ADMIN' ||
    moduleAccess['infraestrutura'] === 'admin' ||
    moduleAccess['listagem-servicos'] === 'admin';
  const canManageCurrentWorkspace = Boolean(isPlatformAdmin || activeWorkspace?.role === 'ADMIN');
  const pendingCount = usePendingUsersCount();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace('/auth');
    }
  }, [data?.user, isPending, router]);

  if (isPending || (!canManageCurrentWorkspace && isModuleAccessLoading)) {
    return null;
  }

  if (!canManageCurrentWorkspace && !canManageDropdowns) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle>Acesso restrito</CardTitle>
            </div>
            <CardDescription>
              Esta area administrativa exige papel global de administrador ou papel `ADMIN` no workspace ativo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">Painel Administrativo</h1>
          {isPlatformAdmin ? <Badge variant="destructive">Papel global: administrador</Badge> : null}
          {activeWorkspace ? <Badge variant="secondary">Workspace: {activeWorkspace.name}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Usuarios, grupos, permissoes extras e modulos abaixo operam no workspace ativo.
        </p>
      </div>

      <Tabs defaultValue={isPlatformAdmin ? (pendingCount > 0 ? 'pendentes' : 'usuarios') : canManageDropdowns ? 'campos' : 'usuarios'}>
        <TabsList>
          {isPlatformAdmin ? (
            <TabsTrigger value="pendentes" className="relative">
              <Clock className="h-4 w-4" />
              Pendentes
              {pendingCount > 0 && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="usuarios">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="grupos">
              <Shield className="h-4 w-4" />
              Grupos do Workspace
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="modulos">
              <Layers3 className="h-4 w-4" />
              Modulos
            </TabsTrigger>
          ) : null}
          {canManageDropdowns ? (
            <TabsTrigger value="campos">
              <SlidersHorizontal className="h-4 w-4" />
              Campos
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="workspaces">
              <Building2 className="h-4 w-4" />
              Workspaces
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="feedbacks">
              <MessageSquare className="h-4 w-4" />
              Feedbacks
            </TabsTrigger>
          ) : null}
          {isPlatformAdmin ? (
            <TabsTrigger value="limpeza">
              <Trash2 className="h-4 w-4" />
              Limpeza de Dados
            </TabsTrigger>
          ) : null}
        </TabsList>

        {isPlatformAdmin ? (
          <TabsContent value="pendentes" className="mt-4">
            <PendingUsersManager />
          </TabsContent>
        ) : null}

        {isPlatformAdmin ? (
          <TabsContent value="usuarios" className="mt-4">
            <UsersManager />
          </TabsContent>
        ) : null}

        {isPlatformAdmin ? (
          <TabsContent value="grupos" className="mt-4">
            <RolesManager />
          </TabsContent>
        ) : null}

        {isPlatformAdmin ? (
          <TabsContent value="modulos" className="mt-4">
            <ModuleManager />
          </TabsContent>
        ) : null}

        {canManageDropdowns ? (
          <TabsContent value="campos" className="mt-4">
            <DropdownOptionsManager />
          </TabsContent>
        ) : null}

        {isPlatformAdmin ? (
          <TabsContent value="workspaces" className="mt-4">
            <WorkspaceManager />
          </TabsContent>
        ) : null}
        {isPlatformAdmin ? (
          <TabsContent value="feedbacks" className="mt-4">
            <FeedbackManager />
          </TabsContent>
        ) : null}
        {isPlatformAdmin ? (
          <TabsContent value="limpeza" className="mt-4">
            <DataCleanupManager />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
