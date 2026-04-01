'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/lib/auth-client';
import { ModuleManager } from '@/components/admin/module-manager';

export default function AdminPage() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const user = data?.user as { name?: string; role?: string } | undefined;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isPending && !isAdmin) {
      router.replace('/dashboard');
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle>Painel ADM</CardTitle>
          </div>
          <CardDescription>
            Área administrativa disponível para {user?.name}. A partir daqui você controla a navegação modular da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta primeira etapa transforma o sistema em uma base modular: o admin passa a controlar quais setores aparecem no menu, qual role mínima acessa cada módulo e se ele aceita importação.
        </CardContent>
      </Card>

      <ModuleManager />
    </div>
  );
}
