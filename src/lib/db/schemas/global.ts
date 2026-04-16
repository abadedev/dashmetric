/**
 * Global schema — public PostgreSQL schema.
 * Tables shared across all workspaces: auth, workspace registry, permissions.
 */

import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  varchar,
  serial,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';

// ── Enums (defined in public, referenced by workspace tables via search_path) ──

export const roleEnum = pgEnum('role', ['user', 'editor', 'admin']);
export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', [
  'ADMIN',
  'MEMBER',
  'VIEWER',
]);

// ── Better Auth tables ──

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  role: roleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ── Workspace registry ──

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    logoDarkUrl: text('logo_dark_url'),
    logoLightUrl: text('logo_light_url'),
    defaultTheme: varchar('default_theme', { length: 20 }).default('dark').notNull(),
    createdBy: text('created_by').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  () => []
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: workspaceMemberRoleEnum('role').default('MEMBER').notNull(),
    grantedBy: text('granted_by').notNull(),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_member_unique_idx').on(table.workspaceId, table.userId),
    index('workspace_member_user_idx').on(table.userId),
    index('workspace_member_workspace_idx').on(table.workspaceId),
  ]
);

// ── Permission system ──

export const accessGroups = pgTable(
  'access_groups',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('access_group_workspace_name_idx').on(table.workspaceId, table.name),
    uniqueIndex('access_group_id_workspace_idx').on(table.id, table.workspaceId),
    index('access_group_workspace_idx').on(table.workspaceId),
  ]
);

export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    moduleSlug: varchar('module_slug', { length: 120 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('permission_module_slug_idx').on(table.moduleSlug)]
);

export const groupPermissions = pgTable(
  'group_permissions',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .notNull()
      .references(() => accessGroups.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('group_permission_unique_idx').on(table.groupId, table.permissionId)]
);

export const userGroups = pgTable(
  'user_groups',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    groupId: integer('group_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId, table.workspaceId],
      foreignColumns: [accessGroups.id, accessGroups.workspaceId],
      name: 'user_groups_group_workspace_fk',
    }).onDelete('cascade'),
    uniqueIndex('user_group_unique_idx').on(table.workspaceId, table.userId, table.groupId),
    index('user_group_workspace_user_idx').on(table.workspaceId, table.userId),
    index('user_group_workspace_group_idx').on(table.workspaceId, table.groupId),
  ]
);

export const userPermissions = pgTable(
  'user_permissions',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('user_permission_unique_idx').on(table.workspaceId, table.userId, table.permissionId),
    index('user_permission_workspace_user_idx').on(table.workspaceId, table.userId),
    index('user_permission_workspace_permission_idx').on(table.workspaceId, table.permissionId),
  ]
);

export const groupModuleAccess = pgTable(
  'group_module_access',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .notNull()
      .references(() => accessGroups.id, { onDelete: 'cascade' }),
    moduleSlug: varchar('module_slug', { length: 120 }).notNull(),
    accessLevel: varchar('access_level', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('group_module_access_unique_idx').on(table.groupId, table.moduleSlug),
    index('group_module_access_group_idx').on(table.groupId),
    index('group_module_access_module_idx').on(table.moduleSlug),
  ]
);

export const userModuleAccess = pgTable(
  'user_module_access',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    moduleSlug: varchar('module_slug', { length: 120 }).notNull(),
    accessLevel: varchar('access_level', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_module_access_unique_idx').on(table.workspaceId, table.userId, table.moduleSlug),
    index('user_module_access_workspace_user_idx').on(table.workspaceId, table.userId),
    index('user_module_access_module_idx').on(table.moduleSlug),
  ]
);

// ── Types ──

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceMemberRole = typeof workspaceMemberRoleEnum.enumValues[number];
export type AccessGroup = typeof accessGroups.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type GroupModuleAccess = typeof groupModuleAccess.$inferSelect;
export type UserModuleAccess = typeof userModuleAccess.$inferSelect;
