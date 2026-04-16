export const MODULE_ACCESS_LEVELS = ['none', 'viewer', 'editor', 'admin'] as const;

export type ModuleAccessLevel = (typeof MODULE_ACCESS_LEVELS)[number];

export const MODULE_ACTIONS = [
  'view',
  'details',
  'create',
  'edit',
  'share',
  'finalize',
  'export',
  'import',
  'delete',
  'manage',
  'admin',
] as const;

export type ModuleAction = (typeof MODULE_ACTIONS)[number];

type PermissionLike = {
  id: number;
  key: string;
  moduleSlug: string;
  action: string;
};

const ACCESS_WEIGHT: Record<ModuleAccessLevel, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  admin: 3,
};

const ACTION_MIN_LEVEL: Record<ModuleAction, ModuleAccessLevel> = {
  view: 'viewer',
  details: 'viewer',
  create: 'editor',
  edit: 'editor',
  share: 'editor',
  finalize: 'editor',
  export: 'editor',
  import: 'admin',
  delete: 'admin',
  manage: 'admin',
  admin: 'admin',
};

export function isGlobalPermissionModule(moduleSlug: string) {
  return moduleSlug.startsWith('admin.');
}

export function compareModuleAccessLevel(left: ModuleAccessLevel, right: ModuleAccessLevel) {
  return ACCESS_WEIGHT[left] - ACCESS_WEIGHT[right];
}

export function maxModuleAccessLevel(
  left: ModuleAccessLevel | null | undefined,
  right: ModuleAccessLevel | null | undefined
): ModuleAccessLevel {
  const safeLeft = left ?? 'none';
  const safeRight = right ?? 'none';
  return compareModuleAccessLevel(safeLeft, safeRight) >= 0 ? safeLeft : safeRight;
}

export function normalizeModuleAction(action: string): ModuleAction | null {
  const normalized = action.trim().toLowerCase();

  if (normalized === 'read') return 'view';
  if (normalized === 'write') return 'edit';
  if (normalized === 'remove') return 'delete';
  if (normalized === 'administrar') return 'admin';

  return (MODULE_ACTIONS as readonly string[]).includes(normalized)
    ? (normalized as ModuleAction)
    : null;
}

export function getActionMinAccessLevel(action: string): ModuleAccessLevel | null {
  const normalizedAction = normalizeModuleAction(action);
  return normalizedAction ? ACTION_MIN_LEVEL[normalizedAction] : null;
}

export function accessLevelAllows(level: ModuleAccessLevel, action: string) {
  const minLevel = getActionMinAccessLevel(action);
  if (!minLevel) return false;
  return ACCESS_WEIGHT[level] >= ACCESS_WEIGHT[minLevel];
}

export function resolveModuleAccessLevelFromKeys(moduleSlug: string, permissionKeys: Iterable<string>): ModuleAccessLevel {
  let level: ModuleAccessLevel = 'none';

  for (const key of permissionKeys) {
    if (!key.startsWith(`${moduleSlug}.`)) continue;

    const action = key.slice(moduleSlug.length + 1);
    const minLevel = getActionMinAccessLevel(action);
    if (!minLevel) continue;

    level = maxModuleAccessLevel(level, minLevel);
  }

  return level;
}

export function resolveModuleAccessMapFromKeys(permissionKeys: Iterable<string>) {
  const accessMap: Record<string, ModuleAccessLevel> = {};

  for (const key of permissionKeys) {
    const segments = key.split('.');
    if (segments.length < 2) continue;

    const action = segments[segments.length - 1] ?? '';
    const moduleSlug = segments.slice(0, -1).join('.');
    if (!moduleSlug || isGlobalPermissionModule(moduleSlug)) continue;

    const minLevel = getActionMinAccessLevel(action);
    if (!minLevel) continue;

    accessMap[moduleSlug] = maxModuleAccessLevel(accessMap[moduleSlug], minLevel);
  }

  return accessMap;
}

export function getPermissionIdsForModuleAccessLevel(
  allPermissions: PermissionLike[],
  moduleSlug: string,
  level: ModuleAccessLevel
) {
  if (level === 'none') return [];

  return allPermissions
    .filter((permission) => permission.moduleSlug === moduleSlug && !isGlobalPermissionModule(permission.moduleSlug))
    .filter((permission) => {
      const normalizedAction = normalizeModuleAction(permission.action) ?? normalizeModuleAction(permission.key.split('.').pop() ?? '');
      return normalizedAction ? accessLevelAllows(level, normalizedAction) : false;
    })
    .map((permission) => permission.id);
}

export function humanizeModuleAccessLevel(level: ModuleAccessLevel) {
  if (level === 'viewer') return 'Visualizador';
  if (level === 'editor') return 'Editor';
  if (level === 'admin') return 'Admin';
  return 'Sem acesso';
}

export function resolveUserModulePermission(
  userOverride: ModuleAccessLevel | null | undefined,
  groupPermission: ModuleAccessLevel | null | undefined
): ModuleAccessLevel {
  if (userOverride !== undefined && userOverride !== null) {
    return userOverride;
  }

  return groupPermission ?? 'none';
}

export function resolveUserModulePermissions(
  groupPermissions: Record<string, ModuleAccessLevel>,
  userOverrides: Record<string, ModuleAccessLevel>
) {
  const resolved: Record<string, ModuleAccessLevel> = {};
  const moduleSlugs = new Set([...Object.keys(groupPermissions), ...Object.keys(userOverrides)]);

  for (const moduleSlug of moduleSlugs) {
    resolved[moduleSlug] = resolveUserModulePermission(
      userOverrides[moduleSlug],
      groupPermissions[moduleSlug]
    );
  }

  return resolved;
}
