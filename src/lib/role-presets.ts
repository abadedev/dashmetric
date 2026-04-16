import type { ModuleAccessLevel } from '@/lib/module-access';

export type ModuleCatalogItem = {
  slug: string;
  name: string;
  description: string | null;
};

export type GlobalPermissionItem = {
  id: number;
  key: string;
  moduleSlug: string;
  action: string;
  description: string | null;
};

export type RolePresetDefinition = {
  key: string;
  label: string;
  description: string;
  moduleAccess: Record<string, ModuleAccessLevel>;
  globalPermissionIds: number[];
};

function mapAllModules(modules: ModuleCatalogItem[], level: ModuleAccessLevel) {
  return Object.fromEntries(modules.map((module) => [module.slug, level])) as Record<string, ModuleAccessLevel>;
}

function pickGlobalPermissions(globalPermissions: GlobalPermissionItem[], keys: string[]) {
  return globalPermissions
    .filter((permission) => keys.includes(permission.key))
    .map((permission) => permission.id);
}

export function buildRolePresets(
  modules: ModuleCatalogItem[],
  globalPermissions: GlobalPermissionItem[]
): RolePresetDefinition[] {
  return [
    {
      key: 'custom',
      label: 'Personalizado',
      description: 'Cria o cargo sem acessos pré-definidos, pronto para configurar módulo por módulo.',
      moduleAccess: mapAllModules(modules, 'none'),
      globalPermissionIds: [],
    },
    {
      key: 'viewer_all',
      label: 'Visualizador',
      description: 'Visualiza dashboards, listagens, detalhes, filtros e buscas em todos os módulos.',
      moduleAccess: mapAllModules(modules, 'viewer'),
      globalPermissionIds: [],
    },
    {
      key: 'editor_all',
      label: 'Editor Operacional',
      description: 'Opera os módulos com criação, edição, compartilhamento, finalização e exportação.',
      moduleAccess: mapAllModules(modules, 'editor'),
      globalPermissionIds: [],
    },
    {
      key: 'admin_all_modules',
      label: 'Admin de Módulos',
      description: 'Administra todos os módulos, incluindo importação e exclusão, sem liberar gestão administrativa global.',
      moduleAccess: mapAllModules(modules, 'admin'),
      globalPermissionIds: [],
    },
    {
      key: 'workspace_admin',
      label: 'Administrador do Workspace',
      description: 'Administra módulos e também usuários, grupos e configurações administrativas do workspace.',
      moduleAccess: mapAllModules(modules, 'admin'),
      globalPermissionIds: pickGlobalPermissions(globalPermissions, [
        'admin.users.manage',
        'admin.groups.manage',
        'admin.modules.manage',
      ]),
    },
  ];
}

export function getRolePresetByKey(
  presets: RolePresetDefinition[],
  presetKey: string | null | undefined
) {
  return presets.find((preset) => preset.key === presetKey) ?? presets[0] ?? null;
}
