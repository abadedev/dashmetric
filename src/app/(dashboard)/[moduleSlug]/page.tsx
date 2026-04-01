import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  BarChart3,
  CheckCircle,
  HeadphonesIcon,
  LayoutDashboard,
  ListTodo,
  Network,
  Shield,
  TrendingUp,
  Trophy,
  Upload,
  UserMinus,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { canAccessModule, getModuleBySlug, type AppRole } from '@/lib/services/module-service';
import { PageLayout } from '@/components/layout/page-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const iconMap = {
  LayoutDashboard,
  ListTodo,
  Trophy,
  CheckCircle,
  HeadphonesIcon,
  BarChart3,
  Upload,
  TrendingUp,
  UserMinus,
  Network,
} as const;

const roleLabel: Record<AppRole, string> = {
  user: 'Usuário',
  editor: 'Editor',
  admin: 'Administrador',
};

function resolveTemplateNarrative(templateSource: string | null, allowImport: boolean) {
  switch (templateSource) {
    case 'vendas':
      return {
        title: 'Base comercial clonada',
        description:
          'Este módulo herda a estrutura analítica de um setor comercial, pronto para evoluir com funil, rankings e leitura por período.',
      };
    case 'dashboard':
      return {
        title: 'Template executivo',
        description:
          'O módulo foi criado a partir de uma base executiva enxuta, com foco em KPIs, filtros e espaço para evoluções por setor.',
      };
    case 'infraestrutura':
      return {
        title: 'Estrutura em branco',
        description:
          'Este módulo foi pensado para crescer aos poucos, mantendo o menu dinâmico, o controle administrativo e a arquitetura atual.',
      };
    default:
      return {
        title: allowImport ? 'Pronto para receber dados' : 'Pronto para evolução futura',
        description: allowImport
          ? 'O módulo já pode ser conectado ao fluxo central de importação conforme os perfis configurados pelo admin.'
          : 'A rota e o cadastro do módulo já estão ativos. O próximo passo é adicionar APIs e componentes específicos sem quebrar o sistema atual.',
      };
  }
}

export default async function DynamicModulePage({
  params,
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/auth');
  }

  const { moduleSlug } = await params;
  const module = await getModuleBySlug(moduleSlug);

  if (!module || !module.isActive) {
    notFound();
  }

  const userRole = ((session.user as { role?: AppRole }).role ?? 'user') as AppRole;
  if (!canAccessModule(userRole, module.requiredRole)) {
    redirect('/dashboard');
  }

  const Icon = iconMap[module.icon as keyof typeof iconMap] ?? LayoutDashboard;
  const narrative = resolveTemplateNarrative(module.templateSource, module.allowImport);

  return (
    <PageLayout
      title={module.name}
      description={
        module.description ??
        'Módulo dinâmico configurado pelo painel administrativo e integrado à navegação da plataforma.'
      }
      actions={
        module.allowImport ? (
          <Link href="/upload">
            <Button>
              <Upload className="h-4 w-4" />
              Importar dados
            </Button>
          </Link>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Icon className="h-5 w-5" />
              <CardTitle>{narrative.title}</CardTitle>
            </div>
            <CardDescription>{narrative.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Role mínima
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {roleLabel[module.requiredRole as AppRole]}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Menu lateral
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {module.showInSidebar ? 'Visível' : 'Oculto'}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Importação
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {module.allowImport ? 'Habilitada' : 'Desabilitada'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <CardTitle>Configuração atual</CardTitle>
            </div>
            <CardDescription>
              Esta página existe para que módulos novos criados no admin já tenham destino válido, sem criar fluxo paralelo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span>Status</span>
              <Badge variant={module.isActive ? 'default' : 'secondary'}>
                {module.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span>Slug</span>
              <span className="font-mono text-foreground">{module.slug}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span>Rota</span>
              <span className="font-mono text-foreground">{module.href}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span>Template base</span>
              <span className="text-foreground">{module.templateSource || 'Sem template'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfis de importação vinculados</CardTitle>
          <CardDescription>
            Perfis cadastrados no painel admin para orientar a entrada de dados deste módulo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {module.importProfiles.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {module.importProfiles.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">{profile.label}</div>
                    <Badge variant={profile.isActive ? 'default' : 'secondary'}>
                      {profile.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Chave: <span className="font-mono">{profile.profileKey}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Detector: <span className="font-mono">{profile.detectorType}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum perfil de importação vinculado até agora. Você pode cadastrar um perfil no painel ADM quando este módulo começar a receber dados.
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
