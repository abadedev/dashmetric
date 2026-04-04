'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Layers3, Shield, ShieldAlert, Users } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/lib/auth-client';
import { ModuleManager } from '@/components/admin/module-manager';
import { UsersManager } from '@/components/admin/users-manager';
import { RolesManager } from '@/components/admin/roles-manager';
import { WorkspaceManager } from '@/components/admin/workspace-manager';

export default function AdminPage() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const user = data?.user as { name?: string; role?: string } | undefined;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isPending && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, isPending, router]);

  if (isPending) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle>Acesso restrito</CardTitle>
            </div>
            <CardDescription>
              Esta área está disponível apenas para contas com perfil administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui você controla quem pode acessar o quê no sistema.
        </p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="grupos">
            <Shield className="h-4 w-4" />
            Grupos de Acesso
          </TabsTrigger>
          <TabsTrigger value="modulos">
            <Layers3 className="h-4 w-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="workspaces">
            <Building2 className="h-4 w-4" />
            Workspaces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsersManager />
        </TabsContent>

        <TabsContent value="grupos" className="mt-4">
          <RolesManager />
        </TabsContent>

        <TabsContent value="modulos" className="mt-4">
          <ModuleManager />
        </TabsContent>

        <TabsContent value="workspaces" className="mt-4">
          <WorkspaceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
