import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  numeric,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';

// ========== ENUMS ==========

export const roleEnum = pgEnum('role', ['user', 'editor', 'admin']);

// ========== BETTER AUTH TABLES ==========

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

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;

export const activityTypeEnum = pgEnum('activity_type', [
  'instalacao_nova',
  'instalacao_reativacao',
  'reparo',
  'mudanca_endereco',
  'retirada_kit',
  'mudanca_plano',
  'retorno',
  'cancelado_reparo',
  'cancelado_retirada_kit',
  'cancelado_mudanca_endereco',
  'cancelado_retorno',
  'cancelado_reativacao_login',
  'reparo_corporativo',
]);

export const qualityIndicatorEnum = pgEnum('quality_indicator', [
  'IQIv',
  'IQRv',
  'RTV',
  'RST',
  'ICT',
  'Retorno',
]);

export const importStatusEnum = pgEnum('import_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

// ========== TABELAS ==========

export const technicians = pgTable(
  'technicians',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    login: varchar('login', { length: 100 }),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tech_name_idx').on(table.name),
    index('tech_login_idx').on(table.login),
  ]
);

export const importBatches = pgTable('import_batches', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  totalRows: integer('total_rows').default(0),
  importedRows: integer('imported_rows').default(0),
  errors: integer('errors').default(0),
  errorDetails: text('error_details'),
  status: importStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const serviceOrders = pgTable(
  'service_orders',
  {
    id: serial('id').primaryKey(),
    osNumber: varchar('os_number', { length: 20 }),
    activityType: activityTypeEnum('activity_type').notNull(),
    reason: text('reason'),
    solution: text('solution'),
    technicianId: integer('technician_id').references(() => technicians.id),
    clientName: varchar('client_name', { length: 255 }),
    city: varchar('city', { length: 100 }),
    plan: varchar('plan', { length: 255 }),
    openedAt: timestamp('opened_at'),
    closedAt: timestamp('closed_at'),
    slaTargetHours: integer('sla_target_hours'),
    slaCorridoSeconds: integer('sla_corrido_seconds'),
    slaUtilSeconds: integer('sla_util_seconds'),
    withinSlaCorrido: boolean('within_sla_corrido'),
    withinSlaUtil: boolean('within_sla_util'),
    importBatchId: integer('import_batch_id').references(() => importBatches.id),
    periodMonth: integer('period_month'),
    periodYear: integer('period_year'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('so_technician_idx').on(table.technicianId),
    index('so_activity_type_idx').on(table.activityType),
    index('so_period_idx').on(table.periodYear, table.periodMonth),
    index('so_city_idx').on(table.city),
    index('so_opened_at_idx').on(table.openedAt),
    index('so_os_number_idx').on(table.osNumber),
  ]
);

export const qualityRecords = pgTable(
  'quality_records',
  {
    id: serial('id').primaryKey(),
    osNumber: varchar('os_number', { length: 20 }),
    indicator: qualityIndicatorEnum('indicator').notNull(),
    reason: text('reason'),
    solution: text('solution'),
    technicianId: integer('technician_id').references(() => technicians.id),
    clientName: varchar('client_name', { length: 255 }),
    city: varchar('city', { length: 100 }),
    plan: varchar('plan', { length: 255 }),
    openedAt: timestamp('opened_at'),
    closedAt: timestamp('closed_at'),
    durationSeconds: integer('duration_seconds'),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('qr_indicator_idx').on(table.indicator),
    index('qr_technician_idx').on(table.technicianId),
    index('qr_period_idx').on(table.periodYear, table.periodMonth),
  ]
);

export const supportRecords = pgTable(
  'support_records',
  {
    id: serial('id').primaryKey(),
    attendantName: varchar('attendant_name', { length: 255 }).notNull(),
    openedManutExt: integer('opened_manut_ext').default(0),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    withoutManut: integer('without_manut').default(0),
    total: integer('total').default(0),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('sr_period_idx').on(table.periodYear, table.periodMonth)]
);

/**
 * Resumo de classificação automática dos atendimentos de suporte por telefone.
 * Gerado automaticamente durante a importação do CSV de suporte.
 */
export const supportCallCategories = pgTable(
  'support_call_categories',
  {
    id: serial('id').primaryKey(),
    categoria: varchar('categoria', { length: 200 }).notNull(),
    quantidade: integer('quantidade').notNull(),
    percentual: numeric('percentual', { precision: 6, scale: 2 }).notNull(),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('scc_period_idx').on(table.periodYear, table.periodMonth)]
);

export const systemModules = pgTable(
  'system_modules',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }).notNull(),
    href: varchar('href', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    showInSidebar: boolean('show_in_sidebar').default(true).notNull(),
    allowImport: boolean('allow_import').default(false).notNull(),
    requiredRole: roleEnum('required_role').default('user').notNull(),
    templateSource: varchar('template_source', { length: 120 }),
    isEditable: boolean('is_editable').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('system_module_slug_idx').on(table.slug),
    uniqueIndex('system_module_href_idx').on(table.href),
    index('system_module_sort_idx').on(table.sortOrder),
  ]
);

export const moduleImportProfiles = pgTable(
  'module_import_profiles',
  {
    id: serial('id').primaryKey(),
    moduleId: integer('module_id')
      .notNull()
      .references(() => systemModules.id, { onDelete: 'cascade' }),
    profileKey: varchar('profile_key', { length: 120 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    detectorType: varchar('detector_type', { length: 120 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('module_import_profile_key_idx').on(table.moduleId, table.profileKey),
    index('module_import_profile_module_idx').on(table.moduleId),
  ]
);

export const salesRecordTypeEnum = pgEnum('sales_record_type', [
  'negociado',
  'fechado',
  'lead_marketing',
  'pedido_instalado',
  'pedido_cancelado',
]);

export const salesRecords = pgTable(
  'sales_records',
  {
    id: serial('id').primaryKey(),
    recordType: salesRecordTypeEnum('record_type').notNull(),
    clientName: varchar('client_name', { length: 255 }),
    city: varchar('city', { length: 120 }),
    source: varchar('source', { length: 120 }),
    indication: varchar('indication', { length: 255 }),
    plan: varchar('plan', { length: 255 }),
    observation: text('observation'),
    requestedAt: timestamp('requested_at'),
    installedAt: timestamp('installed_at'),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sales_record_period_idx').on(table.periodYear, table.periodMonth),
    index('sales_record_type_idx').on(table.recordType),
    index('sales_record_city_idx').on(table.city),
  ]
);

export const cancellationRecords = pgTable(
  'cancellation_records',
  {
    id: serial('id').primaryKey(),
    clientName: varchar('client_name', { length: 255 }),
    city: varchar('city', { length: 120 }),
    reason: text('reason'),
    source: varchar('source', { length: 120 }),
    plan: varchar('plan', { length: 255 }),
    observation: text('observation'),
    cancelledAt: timestamp('cancelled_at'),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('cancellation_record_period_idx').on(table.periodYear, table.periodMonth),
    index('cancellation_record_city_idx').on(table.city),
  ]
);

export const infrastructureRecords = pgTable(
  'infrastructure_records',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }),
    category: varchar('category', { length: 120 }),
    city: varchar('city', { length: 120 }),
    referenceDate: timestamp('reference_date'),
    payload: jsonb('payload'),
    periodMonth: integer('period_month'),
    periodYear: integer('period_year'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('infrastructure_record_period_idx').on(table.periodYear, table.periodMonth),
    index('infrastructure_record_city_idx').on(table.city),
  ]
);

export const holidays = pgTable(
  'holidays',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    year: integer('year').notNull(),
  },
  (table) => [uniqueIndex('holiday_date_idx').on(table.date)]
);

export const slaTargets = pgTable('sla_targets', {
  id: serial('id').primaryKey(),
  activityType: activityTypeEnum('activity_type').notNull().unique(),
  targetHours: integer('target_hours'),
});

// ========== MÓDULO DE IMPORTAÇÃO (novo) ==========

/** Lote de importação: metadados de cada upload */
export const lotesImportacao = pgTable('lotes_importacao', {
  id: serial('id').primaryKey(),
  arquivo: varchar('arquivo', { length: 255 }).notNull(),
  tipoArquivo: varchar('tipo_arquivo', { length: 10 }).notNull(), // 'csv' | 'xlsx'
  status: varchar('status', { length: 20 }).notNull().default('pendente'),
  totalLidas: integer('total_lidas').default(0),
  totalValidas: integer('total_validas').default(0),
  totalInvalidas: integer('total_invalidas').default(0),
  totalInseridas: integer('total_inseridas').default(0),
  totalDuplicadas: integer('total_duplicadas').default(0),
  erros: jsonb('erros'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Linhas brutas preservadas para auditoria */
export const importacoesBrutas = pgTable('importacoes_brutas', {
  id: serial('id').primaryKey(),
  loteImportacaoId: integer('lote_importacao_id').references(() => lotesImportacao.id),
  rawJson: jsonb('raw_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Tabela principal de atendimentos normalizada */
export const atendimentos = pgTable(
  'atendimentos',
  {
    id: serial('id').primaryKey(),

    // Campos principais
    numeroOs: varchar('numero_os', { length: 50 }),
    tipo: varchar('tipo', { length: 100 }).notNull(),
    motivo: text('motivo'),
    solucao: text('solucao'),
    tecnico: varchar('tecnico', { length: 255 }),
    tecnicoId: integer('tecnico_id').references(() => technicians.id),
    cliente: varchar('cliente', { length: 255 }),
    cidade: varchar('cidade', { length: 100 }),
    plano: varchar('plano', { length: 255 }),

    // Data/hora (strings de exibição + timestamp para queries)
    dataAbertura: varchar('data_abertura', { length: 10 }),
    horaAbertura: varchar('hora_abertura', { length: 8 }),
    dataFinalizacao: varchar('data_finalizacao', { length: 10 }),
    horaFinalizacao: varchar('hora_finalizacao', { length: 8 }),
    aberturaAt: timestamp('abertura_at'),
    finalizacaoAt: timestamp('finalizacao_at'),

    // SLA
    intervalo: varchar('intervalo', { length: 50 }),
    slaHoras: numeric('sla_horas', { precision: 6, scale: 2 }),
    dentroSla: boolean('dentro_sla'),
    slaCorridoSegundos: integer('sla_corrido_segundos'),
    slaUtilSegundos: integer('sla_util_segundos'),
    dentroSlaUtil: boolean('dentro_sla_util'),

    // Campos extras do CSV
    login: varchar('login', { length: 100 }),
    endereco: text('endereco'),
    bairro: varchar('bairro', { length: 100 }),
    referencia: text('referencia'),
    atendente: varchar('atendente', { length: 255 }),
    indicacao: varchar('indicacao', { length: 255 }),
    mac: varchar('mac', { length: 20 }),
    ativo: varchar('ativo', { length: 5 }),
    empresa: varchar('empresa', { length: 255 }),
    dataLiberada: varchar('data_liberada', { length: 50 }),
    observacao: text('observacao'),
    coordenadas: varchar('coordenadas', { length: 100 }),
    telefones: varchar('telefones', { length: 255 }),
    agendamento: varchar('agendamento', { length: 100 }),

    // Controle
    hashImportacao: varchar('hash_importacao', { length: 64 }).notNull(),
    loteImportacaoId: integer('lote_importacao_id').references(() => lotesImportacao.id),
    periodMonth: integer('period_month'),
    periodYear: integer('period_year'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('atend_hash_idx').on(t.hashImportacao),
    index('atend_tecnico_id_idx').on(t.tecnicoId),
    index('atend_tipo_idx').on(t.tipo),
    index('atend_period_idx').on(t.periodYear, t.periodMonth),
    index('atend_abertura_at_idx').on(t.aberturaAt),
    index('atend_cidade_idx').on(t.cidade),
  ]
);

// ========== PERMISSION SYSTEM ==========

export const accessGroups = pgTable('access_groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    moduleSlug: varchar('module_slug', { length: 120 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(), // 'read' | 'write'
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('permission_key_idx').on(table.key),
    index('permission_module_slug_idx').on(table.moduleSlug),
  ]
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
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    groupId: integer('group_id')
      .notNull()
      .references(() => accessGroups.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('user_group_unique_idx').on(table.userId, table.groupId)]
);

export const userPermissions = pgTable(
  'user_permissions',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('user_permission_unique_idx').on(table.userId, table.permissionId)]
);

// ========== TYPES ==========

export type Technician = typeof technicians.$inferSelect;
export type NewTechnician = typeof technicians.$inferInsert;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type NewServiceOrder = typeof serviceOrders.$inferInsert;
export type QualityRecord = typeof qualityRecords.$inferSelect;
export type NewQualityRecord = typeof qualityRecords.$inferInsert;
export type SupportRecord = typeof supportRecords.$inferSelect;
export type NewSupportRecord = typeof supportRecords.$inferInsert;
export type SupportCallCategory = typeof supportCallCategories.$inferSelect;
export type NewSupportCallCategory = typeof supportCallCategories.$inferInsert;
export type SystemModule = typeof systemModules.$inferSelect;
export type NewSystemModule = typeof systemModules.$inferInsert;
export type ModuleImportProfile = typeof moduleImportProfiles.$inferSelect;
export type NewModuleImportProfile = typeof moduleImportProfiles.$inferInsert;
export type SalesRecord = typeof salesRecords.$inferSelect;
export type NewSalesRecord = typeof salesRecords.$inferInsert;
export type CancellationRecord = typeof cancellationRecords.$inferSelect;
export type NewCancellationRecord = typeof cancellationRecords.$inferInsert;
export type InfrastructureRecord = typeof infrastructureRecords.$inferSelect;
export type NewInfrastructureRecord = typeof infrastructureRecords.$inferInsert;
export type Holiday = typeof holidays.$inferSelect;
export type ImportBatch = typeof importBatches.$inferSelect;
export type ActivityType = typeof activityTypeEnum.enumValues[number];
export type QualityIndicator = typeof qualityIndicatorEnum.enumValues[number];
export type SalesRecordType = typeof salesRecordTypeEnum.enumValues[number];
export type LoteImportacao = typeof lotesImportacao.$inferSelect;
export type Atendimento = typeof atendimentos.$inferSelect;
export type NewAtendimento = typeof atendimentos.$inferInsert;
export type AccessGroup = typeof accessGroups.$inferSelect;
export type NewAccessGroup = typeof accessGroups.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type GroupPermission = typeof groupPermissions.$inferSelect;
export type UserGroup = typeof userGroups.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;
