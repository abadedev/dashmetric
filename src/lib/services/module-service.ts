import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  moduleImportProfiles,
  systemModules,
  type NewModuleImportProfile,
  type NewSystemModule,
} from '@/lib/db/schema';

export type AppRole = 'user' | 'editor' | 'admin';

export type SidebarModuleItem = {
  id: number;
  name: string;
  slug: string;
  href: string;
  icon: string;
  allowImport: boolean;
};

export function slugToHref(slug: string) {
  return `/${slug.trim().replace(/^\/+/, '')}`;
}

const DEFAULT_MODULES: Array<{
  module: NewSystemModule;
  importProfiles?: NewModuleImportProfile[];
}> = [
  {
    module: {
      name: 'Dashboard Executivo',
      slug: 'dashboard',
      description: 'Visao executiva consolidada dos principais indicadores operacionais.',
      icon: 'LayoutDashboard',
      href: '/',
      sortOrder: 10,
      isActive: true,
      showInSidebar: true,
      allowImport: false,
      requiredRole: 'user',
      templateSource: 'dashboard',
      isEditable: false,
    },
  },
  {
    module: {
      name: 'Atendimentos',
      slug: 'atendimentos',
      description: 'Listagem detalhada das ordens e ocorrencias operacionais.',
      icon: 'ListTodo',
      href: '/atendimentos',
      sortOrder: 20,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'atendimentos',
      isEditable: false,
    },
    importProfiles: [
      {
        moduleId: 0,
        profileKey: 'atendimentos_instalacoes',
        label: 'Atendimentos / Instalacoes',
        detectorType: 'atendimentos',
        isActive: true,
      },
    ],
  },
  {
    module: {
      name: 'Ranking Tecnicos',
      slug: 'ranking',
      description: 'Comparativo de producao tecnica com filtros por periodo e cidade.',
      icon: 'Trophy',
      href: '/ranking',
      sortOrder: 30,
      isActive: true,
      showInSidebar: true,
      allowImport: false,
      requiredRole: 'user',
      templateSource: 'ranking',
      isEditable: false,
    },
  },
  {
    module: {
      name: 'Qualidade & Reclamacoes',
      slug: 'qualidade',
      description: 'Indicadores de qualidade, retorno e reclamacoes.',
      icon: 'CheckCircle',
      href: '/qualidade',
      sortOrder: 40,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'qualidade',
      isEditable: false,
    },
    importProfiles: [
      {
        moduleId: 0,
        profileKey: 'qualidade_indicadores',
        label: 'Planilha de Qualidade e Reclamacoes',
        detectorType: 'qualidade',
        isActive: true,
      },
    ],
  },
  {
    module: {
      name: 'Suporte Tecnico',
      slug: 'suporte',
      description: 'Resumo dos atendimentos de suporte por telefone e classificacao automatica.',
      icon: 'HeadphonesIcon',
      href: '/suporte',
      sortOrder: 50,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'suporte',
      isEditable: false,
    },
    importProfiles: [
      {
        moduleId: 0,
        profileKey: 'suporte_telefone',
        label: 'CSV de Suporte por Telefone',
        detectorType: 'suporte',
        isActive: true,
      },
    ],
  },
  {
    module: {
      name: 'Vendas',
      slug: 'vendas',
      description: 'Indicadores de negociacao, conversao, instalacoes e cancelamentos de vendas.',
      icon: 'TrendingUp',
      href: '/vendas',
      sortOrder: 60,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'dashboard',
      isEditable: true,
    },
    importProfiles: [
      {
        moduleId: 0,
        profileKey: 'vendas_contratacoes',
        label: 'Contratacoes presencial / fora do horario',
        detectorType: 'vendas_contratacoes',
        isActive: true,
      },
      {
        moduleId: 0,
        profileKey: 'vendas_pedidos_cancelados',
        label: 'Pedidos cancelados antes da instalacao',
        detectorType: 'vendas_cancelamentos',
        isActive: true,
      },
      {
        moduleId: 0,
        profileKey: 'vendas_instalacoes',
        label: 'Pedidos de instalacoes',
        detectorType: 'vendas_instalacoes',
        isActive: true,
      },
    ],
  },
  {
    module: {
      name: 'Cancelamentos',
      slug: 'cancelamentos',
      description: 'Indicadores de cancelamento por cidade, motivo e evolucao do periodo.',
      icon: 'UserMinus',
      href: '/cancelamentos',
      sortOrder: 70,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'vendas',
      isEditable: true,
    },
    importProfiles: [
      {
        moduleId: 0,
        profileKey: 'cancelamentos_operacionais',
        label: 'Base de Cancelamentos',
        detectorType: 'cancelamentos',
        isActive: true,
      },
    ],
  },
  {
    module: {
      name: 'Infraestrutura',
      slug: 'infraestrutura',
      description: 'Modulo em branco para evolucao futura dos indicadores de infraestrutura.',
      icon: 'Network',
      href: '/infraestrutura',
      sortOrder: 80,
      isActive: true,
      showInSidebar: true,
      allowImport: false,
      requiredRole: 'user',
      templateSource: 'infraestrutura',
      isEditable: true,
    },
  },
  {
    module: {
      name: 'Resumo SLA',
      slug: 'resumo-sla',
      description: 'Resumo consolidado do SLA util e corrido por tipo operacional.',
      icon: 'BarChart3',
      href: '/resumo-sla',
      sortOrder: 90,
      isActive: true,
      showInSidebar: true,
      allowImport: false,
      requiredRole: 'user',
      templateSource: 'resumo-sla',
      isEditable: false,
    },
  },
  {
    module: {
      name: 'Importar Dados',
      slug: 'upload',
      description: 'Entrada centralizada para importacao de bases CSV e XLSX.',
      icon: 'Upload',
      href: '/upload',
      sortOrder: 100,
      isActive: true,
      showInSidebar: true,
      allowImport: true,
      requiredRole: 'user',
      templateSource: 'upload',
      isEditable: false,
    },
  },
];

export const NEW_WORKSPACE_ENABLED_MODULE_SLUGS = new Set(['dashboard', 'upload']);

export function getDefaultModuleActivationState(
  module: Pick<NewSystemModule, 'slug' | 'isActive' | 'showInSidebar'>,
  options?: { isNewWorkspaceBootstrap?: boolean }
) {
  if (!options?.isNewWorkspaceBootstrap) {
    return {
      isActive: module.isActive ?? true,
      showInSidebar: module.showInSidebar ?? true,
    };
  }

  const enabledByDefault = NEW_WORKSPACE_ENABLED_MODULE_SLUGS.has(module.slug ?? '');

  return {
    isActive: enabledByDefault,
    showInSidebar: enabledByDefault,
  };
}

const ROLE_WEIGHT: Record<AppRole, number> = {
  user: 1,
  editor: 2,
  admin: 3,
};

export function canAccessModule(userRole: AppRole, requiredRole: AppRole) {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[requiredRole];
}

export async function ensureDefaultModules(workspaceId: string) {
  // Also include rows with NULL workspace_id: these are legacy modules created
  // before the workspace migration. We'll claim them below instead of re-inserting
  // (which would hit the old global unique index on slug).
  // TODO(next phase): once every environment is verified and backfilled,
  // stop claiming NULL workspace rows here and enforce workspace ownership at the schema level.
  const existing = await db
    .select()
    .from(systemModules)
    .where(
      or(
        eq(systemModules.workspaceId, workspaceId),
        isNull(systemModules.workspaceId)
      )
    );
  const existingBySlug = new Map(existing.map((item) => [item.slug, item]));
  const existingProfiles =
    existing.length > 0
      ? await db
          .select()
          .from(moduleImportProfiles)
          .where(inArray(moduleImportProfiles.moduleId, existing.map((item) => item.id)))
      : [];
  const hasWorkspaceOwnedModules = existing.some((item) => item.workspaceId === workspaceId);

  for (const definition of DEFAULT_MODULES) {
    const found = existingBySlug.get(definition.module.slug!);

    if (!found) {
      const activationState = getDefaultModuleActivationState(definition.module, {
        isNewWorkspaceBootstrap: !hasWorkspaceOwnedModules,
      });

      const [inserted] = await db
        .insert(systemModules)
        .values({
          ...definition.module,
          ...activationState,
          workspaceId,
        })
        .returning();

      if (definition.importProfiles?.length) {
        await db.insert(moduleImportProfiles).values(
          definition.importProfiles.map((profile) => ({
            ...profile,
            moduleId: inserted.id,
          }))
        );
      }

      continue;
    }

    // Claim legacy rows that have NULL workspace_id (created before workspace migration).
    if (found.workspaceId === null) {
      await db
        .update(systemModules)
        .set({ workspaceId, updatedAt: new Date() })
        .where(eq(systemModules.id, found.id));
    }

    if (found.href !== definition.module.href) {
      await db
        .update(systemModules)
        .set({
          href: definition.module.href!,
          updatedAt: new Date(),
        })
        .where(eq(systemModules.id, found.id));
    }

    if (found.slug === 'infraestrutura') {
      if (found.allowImport !== false || found.templateSource !== 'infraestrutura') {
        await db
          .update(systemModules)
          .set({
            allowImport: false,
            templateSource: 'infraestrutura',
            updatedAt: new Date(),
          })
          .where(eq(systemModules.id, found.id));
      }

      const infraProfiles = existingProfiles.filter((profile) => profile.moduleId === found.id);
      const obsoleteInfraProfile = infraProfiles.find(
        (profile) => profile.detectorType === 'infraestrutura'
      );

      if (obsoleteInfraProfile) {
        await db
          .delete(moduleImportProfiles)
          .where(eq(moduleImportProfiles.id, obsoleteInfraProfile.id));
      }
    }

    if (definition.importProfiles?.length) {
      const profileKeys = new Set(
        existingProfiles
          .filter((profile) => profile.moduleId === found.id)
          .map((profile) => profile.profileKey)
      );

      const missingProfiles = definition.importProfiles.filter(
        (profile) => !profileKeys.has(profile.profileKey)
      );

      if (missingProfiles.length) {
        await db.insert(moduleImportProfiles).values(
          missingProfiles.map((profile) => ({
            ...profile,
            moduleId: found.id,
          }))
        );
      }
    }
  }
}

export async function listAllModules(workspaceId: string) {
  await ensureDefaultModules(workspaceId);

  const modules = await db
    .select()
    .from(systemModules)
    .where(eq(systemModules.workspaceId, workspaceId))
    .orderBy(asc(systemModules.sortOrder), asc(systemModules.name));

  const profiles =
    modules.length > 0
      ? await db
          .select()
          .from(moduleImportProfiles)
          .where(inArray(moduleImportProfiles.moduleId, modules.map((module) => module.id)))
          .orderBy(asc(moduleImportProfiles.label))
      : [];

  return modules.map((module) => ({
    ...module,
    importProfiles: profiles.filter((profile) => profile.moduleId === module.id),
  }));
}

export async function listSidebarModules(userRole: AppRole, workspaceId: string): Promise<SidebarModuleItem[]> {
  await ensureDefaultModules(workspaceId);

  const modules = await db
    .select()
    .from(systemModules)
    .where(eq(systemModules.workspaceId, workspaceId))
    .orderBy(asc(systemModules.sortOrder), asc(systemModules.name));

  return modules
    .filter(
      (module) =>
        module.isActive &&
        module.showInSidebar &&
        canAccessModule(userRole, module.requiredRole)
    )
    .map((module) => ({
      id: module.id,
      name: module.name,
      slug: module.slug,
      href: module.href,
      icon: module.icon,
      allowImport: module.allowImport,
    }));
}

export async function getModuleById(id: number) {
  const [module] = await db.select().from(systemModules).where(eq(systemModules.id, id));
  return module ?? null;
}

export async function getModuleBySlug(slug: string, workspaceId: string) {
  await ensureDefaultModules(workspaceId);

  const [module] = await db
    .select()
    .from(systemModules)
    .where(and(eq(systemModules.slug, slug), eq(systemModules.workspaceId, workspaceId)));

  if (!module) {
    return null;
  }

  const profiles = await db
    .select()
    .from(moduleImportProfiles)
    .where(eq(moduleImportProfiles.moduleId, module.id))
    .orderBy(asc(moduleImportProfiles.label));

  return {
    ...module,
    importProfiles: profiles,
  };
}
