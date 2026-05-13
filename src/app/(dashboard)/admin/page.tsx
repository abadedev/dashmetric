'use client';

import { Suspense, useEffect, useMemo, type ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import {
  Bell,
  Building2,
  Clock,
  Gauge,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/state-display';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { ModuleManager } from '@/components/admin/module-manager';
import { UsersManager } from '@/components/admin/users-manager';
import { RolesManager } from '@/components/admin/roles-manager';
import { WorkspaceManager } from '@/components/admin/workspace-manager';
import { PendingUsersManager, usePendingUsersCount } from '@/components/admin/pending-users-manager';
import { DataCleanupManager } from '@/components/admin/data-cleanup-manager';
import { DropdownOptionsManager } from '@/components/admin/dropdown-options-manager';
import { FeedbackManager } from '@/components/admin/feedback-manager';
import { NotificationsManager } from '@/components/admin/notifications-manager';
import { SlaConfigManager } from '@/components/admin/sla-config-manager';

type SectionKey =
  | 'usuarios'
  | 'grupos'
  | 'pendentes'
  | 'modulos'
  | 'workspaces'
  | 'campos'
  | 'sla'
  | 'feedbacks'
  | 'notificacoes'
  | 'limpeza';

type Section = {
  key: SectionKey;
  label: string;
  description: string;
  icon: ElementType;
  visible: boolean;
  danger?: boolean;
  badgeCount?: number;
  render: () => React.ReactNode;
};

type SectionGroup = {
  label: string;
  sections: Section[];
};

function readActiveWorkspaceCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((item) => item.startsWith('dwm_active_workspace='));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

function AdminPageContent() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [aba, setAba] = useQueryState('aba');
  const user = data?.user as { name?: string; role?: string } | undefined;
  const isPlatformAdmin = user?.role === 'admin';

  const activeWorkspaceSlug = useMemo(() => readActiveWorkspaceCookie(), []);

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
      return workspaces.find((w) => w.slug === activeWorkspaceSlug) ?? workspaces[0] ?? null;
    }
    return workspaces[0] ?? null;
  }, [activeWorkspaceSlug, workspaceData?.data]);

  const moduleAccess = moduleAccessData?.data?.moduleAccess ?? {};
  const canManageDropdowns =
    isPlatformAdmin ||
    activeWorkspace?.role === 'ADMIN' ||
    moduleAccess['infraestrutura'] === 'admin' ||
    moduleAccess['listagem-servicos'] === 'admin';
  const canManageCurrentWorkspace = Boolean(isPlatformAdmin || activeWorkspace?.role === 'ADMIN');
  const pendingCount = usePendingUsersCount();

  useEffect(() => {
    if (!isPending && !data?.user) router.replace('/auth');
  }, [data?.user, isPending, router]);

  const groups: SectionGroup[] = useMemo(
    () => [
      {
        label: 'Pessoas',
        sections: [
          {
            key: 'usuarios',
            label: 'Usuários',
            description: 'Gerenciamento de contas, papéis globais e acesso por workspace.',
            icon: Users,
            visible: isPlatformAdmin,
            render: () => <UsersManager />,
          },
          {
            key: 'grupos',
            label: 'Grupos do Workspace',
            description: 'Grupos de acesso e permissões coletivas aplicadas ao workspace.',
            icon: Shield,
            visible: isPlatformAdmin,
            render: () => <RolesManager />,
          },
          {
            key: 'pendentes',
            label: 'Pendentes',
            description: 'Aprovação de novos cadastros aguardando validação.',
            icon: Clock,
            visible: isPlatformAdmin,
            badgeCount: pendingCount,
            render: () => <PendingUsersManager />,
          },
        ],
      },
      {
        label: 'Sistema',
        sections: [
          {
            key: 'modulos',
            label: 'Módulos',
            description: 'Cadastro de módulos, ícones e ordenação na sidebar.',
            icon: LayoutGrid,
            visible: isPlatformAdmin,
            render: () => <ModuleManager />,
          },
          {
            key: 'workspaces',
            label: 'Workspaces',
            description: 'Criação, branding e membros dos workspaces.',
            icon: Building2,
            visible: isPlatformAdmin,
            render: () => <WorkspaceManager />,
          },
          {
            key: 'campos',
            label: 'Campos',
            description: 'Listas de opções utilizadas por módulos operacionais.',
            icon: ListChecks,
            visible: canManageDropdowns,
            render: () => <DropdownOptionsManager />,
          },
        ],
      },
      {
        label: 'Operação',
        sections: [
          {
            key: 'sla',
            label: 'SLA Infra',
            description: 'Metas em horas por prioridade da Listagem de Serviços.',
            icon: Gauge,
            visible: canManageCurrentWorkspace,
            render: () => <SlaConfigManager />,
          },
          {
            key: 'feedbacks',
            label: 'Feedbacks',
            description: 'Mensagens enviadas pelos usuários sobre o sistema.',
            icon: MessageSquare,
            visible: isPlatformAdmin,
            render: () => <FeedbackManager />,
          },
          {
            key: 'notificacoes',
            label: 'Notificações',
            description: 'Notificações globais e dispatch para todos os usuários.',
            icon: Bell,
            visible: isPlatformAdmin,
            render: () => <NotificationsManager />,
          },
        ],
      },
      {
        label: 'Manutenção',
        sections: [
          {
            key: 'limpeza',
            label: 'Limpeza',
            description: 'Operações destrutivas de remoção de dados em massa.',
            icon: Trash2,
            visible: isPlatformAdmin,
            danger: true,
            render: () => <DataCleanupManager />,
          },
        ],
      },
    ],
    [canManageCurrentWorkspace, canManageDropdowns, isPlatformAdmin, pendingCount]
  );

  const visibleSections = useMemo(
    () => groups.flatMap((g) => g.sections.filter((s) => s.visible)),
    [groups]
  );

  const activeSection = useMemo(() => {
    if (visibleSections.length === 0) return null;
    const fromUrl = aba ? visibleSections.find((s) => s.key === aba) : null;
    if (fromUrl) return fromUrl;
    const preferUsuarios = visibleSections.find((s) => s.key === 'usuarios');
    return preferUsuarios ?? visibleSections[0];
  }, [aba, visibleSections]);

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
              Esta área administrativa exige papel global de administrador ou papel `ADMIN` no workspace ativo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {/* Cabeçalho geral */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-5 py-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Usuários, grupos, permissões e módulos operam no workspace ativo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPlatformAdmin && <Badge variant="destructive">Papel global: admin</Badge>}
          {activeWorkspace && (
            <Badge variant="secondary">
              Workspace: {activeWorkspace.name}
              {activeWorkspace.role === 'ADMIN' ? ' · ADMIN' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Painel split */}
      <div className="grid gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card/40 md:grid-cols-[200px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-4 border-b border-border/60 bg-muted/30 py-4 md:border-b-0 md:border-r">
          {groups.map((group) => {
            const items = group.sections.filter((s) => s.visible);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="flex flex-col">
                <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  {group.label}
                </div>
                <ul className="flex flex-col">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection?.key === item.key;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => setAba(item.key)}
                          className={cn(
                            'group flex w-full items-center gap-2.5 border-r-2 px-4 py-[7px] text-left text-sm transition-colors',
                            isActive
                              ? cn(
                                  'border-foreground/70 bg-background font-medium',
                                  item.danger ? 'text-red-400' : 'text-foreground'
                                )
                              : cn(
                                  'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground',
                                  item.danger && 'hover:text-red-400'
                                )
                          )}
                        >
                          <Icon
                            className={cn(
                              'shrink-0',
                              item.danger && (isActive ? 'text-red-400' : 'text-red-400/70')
                            )}
                            style={{ width: 15, height: 15 }}
                            strokeWidth={1.75}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badgeCount && item.badgeCount > 0 ? (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                              {item.badgeCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </aside>

        {/* Conteúdo */}
        <section className="flex min-w-0 flex-col bg-background">
          {activeSection ? (
            <>
              <header className="flex flex-col gap-1 border-b border-border/60 px-6 py-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <activeSection.icon
                    className={cn(activeSection.danger && 'text-red-400')}
                    style={{ width: 16, height: 16 }}
                    strokeWidth={1.75}
                  />
                  {activeSection.label}
                </h2>
                <p className="text-xs text-muted-foreground">{activeSection.description}</p>
              </header>
              <div className="min-w-0 flex-1 p-6">{activeSection.render()}</div>
            </>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Nenhuma seção disponível.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminPageContent />
    </Suspense>
  );
}
