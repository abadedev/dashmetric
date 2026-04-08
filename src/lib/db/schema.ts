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
  uuid,
  foreignKey,
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

// ========== TABELAS ==========
//
// LEGACY MIGRATION NOTE:
// Several operational tables still keep `workspaceId` nullable in the canonical schema
// for cross-environment rollout safety. The current environment is already backfilled,
// but we are intentionally not enforcing mass `NOT NULL` here until every deployed
// database is verified and covered by broader integration checks.

export const technicians = pgTable(
  'technicians',
  {
    id: serial('id').primaryKey(),
    // nullable during migration — TODO: add .notNull() after data migration
    workspaceId: uuid('workspace_id'),
    name: varchar('name', { length: 255 }).notNull(),
    login: varchar('login', { length: 100 }),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // unique name per workspace; legacy global uniqueness kept until migration completes
    uniqueIndex('tech_name_idx').on(table.name),
    index('tech_login_idx').on(table.login),
    index('tech_workspace_id_idx').on(table.workspaceId),
  ]
);

export const qualityRecords = pgTable(
  'quality_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    osNumber: varchar('os_number', { length: 20 }),
    indicator: qualityIndicatorEnum('indicator').notNull(),
    reason: text('reason'),
    solution: text('solution'),
    technicianId: integer('technician_id').references(() => technicians.id),
    technicianName: varchar('technician_name', { length: 255 }),
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
    index('qr_workspace_id_idx').on(table.workspaceId),
    index('qr_indicator_idx').on(table.indicator),
    index('qr_technician_idx').on(table.technicianId),
    index('qr_period_idx').on(table.periodYear, table.periodMonth),
    index('qr_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
  ]
);

export const supportRecords = pgTable(
  'support_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    attendantName: varchar('attendant_name', { length: 255 }).notNull(),
    supportCategory: varchar('support_category', { length: 200 }),
    openedManutExt: integer('opened_manut_ext').default(0),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    withoutManut: integer('without_manut').default(0),
    total: integer('total').default(0),
    openedAt: timestamp('opened_at'),
    closedAt: timestamp('closed_at'),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sr_workspace_id_idx').on(table.workspaceId),
    index('sr_category_idx').on(table.supportCategory),
    index('sr_period_idx').on(table.periodYear, table.periodMonth),
    index('sr_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
    index('sr_opened_at_idx').on(table.openedAt),
    index('sr_closed_at_idx').on(table.closedAt),
  ]
);

/**
 * Resumo de classificação automática dos atendimentos de suporte por telefone.
 * Gerado automaticamente durante a importação do CSV de suporte.
 */
export const supportCallCategories = pgTable(
  'support_call_categories',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    categoria: varchar('categoria', { length: 200 }).notNull(),
    quantidade: integer('quantidade').notNull(),
    percentual: numeric('percentual', { precision: 6, scale: 2 }).notNull(),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('scc_workspace_id_idx').on(table.workspaceId),
    index('scc_period_idx').on(table.periodYear, table.periodMonth),
    index('scc_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
  ]
);

export const systemModules = pgTable(
  'system_modules',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
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
    index('system_module_workspace_id_idx').on(table.workspaceId),
    uniqueIndex('system_module_ws_slug_idx').on(table.workspaceId, table.slug),
    uniqueIndex('system_module_ws_href_idx').on(table.workspaceId, table.href),
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
    parameters: jsonb('parameters').default([]),
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
    workspaceId: uuid('workspace_id'), // nullable during migration
    recordType: salesRecordTypeEnum('record_type').notNull(),
    originSector: varchar('origin_sector', { length: 50 }).default('vendas').notNull(),
    csvCategory: varchar('csv_category', { length: 50 }).default('padrao').notNull(),
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
    index('sales_record_workspace_id_idx').on(table.workspaceId),
    index('sales_record_period_idx').on(table.periodYear, table.periodMonth),
    index('sales_record_type_idx').on(table.recordType),
    index('sales_record_origin_sector_idx').on(table.originSector),
    index('sales_record_csv_category_idx').on(table.csvCategory),
    index('sales_record_city_idx').on(table.city),
    index('sales_record_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
  ]
);

export const salesReferralStatusEnum = pgEnum('sales_referral_status', [
  'contratado',
  'pendente',
  'reprovado',
]);

export const salesReferralRecords = pgTable(
  'sales_referral_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'),
    cadastroAt: timestamp('cadastro_at'),
    indicante: varchar('indicante', { length: 255 }),
    indicado: varchar('indicado', { length: 255 }),
    contratado: varchar('contratado', { length: 255 }),
    telefoneIndicado: varchar('telefone_indicado', { length: 50 }),
    cidade: varchar('cidade', { length: 120 }),
    status: salesReferralStatusEnum('status').notNull(),
    rawStatus: varchar('raw_status', { length: 120 }),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sales_referral_workspace_idx').on(table.workspaceId),
    index('sales_referral_status_idx').on(table.status),
    index('sales_referral_city_idx').on(table.cidade),
    index('sales_referral_period_idx').on(table.periodYear, table.periodMonth),
    index('sales_referral_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
    index('sales_referral_cadastro_idx').on(table.cadastroAt),
  ]
);

export const cancellationRecords = pgTable(
  'cancellation_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    originSector: varchar('origin_sector', { length: 50 }).default('retencao').notNull(),
    clientName: varchar('client_name', { length: 255 }),
    city: varchar('city', { length: 120 }),
    status: varchar('status', { length: 120 }),
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
    index('cancellation_record_workspace_id_idx').on(table.workspaceId),
    index('cancellation_record_origin_sector_idx').on(table.originSector),
    index('cancellation_record_period_idx').on(table.periodYear, table.periodMonth),
    index('cancellation_record_city_idx').on(table.city),
    index('cancellation_record_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
  ]
);

export const infrastructureRecords = pgTable(
  'infrastructure_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
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
    index('infrastructure_record_workspace_id_idx').on(table.workspaceId),
    index('infrastructure_record_period_idx').on(table.periodYear, table.periodMonth),
    index('infrastructure_record_city_idx').on(table.city),
    index('infrastructure_record_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
  ]
);

export const omnichannelRecords = pgTable(
  'omnichannel_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'),
    agente: varchar('agente', { length: 255 }).notNull(),
    isHuman: boolean('is_human').default(true).notNull(),
    quantidade: integer('quantidade'),
    te: varchar('te', { length: 20 }),
    tme: varchar('tme', { length: 20 }),
    ta: varchar('ta', { length: 20 }),
    tma: varchar('tma', { length: 20 }),
    tp: varchar('tp', { length: 20 }),
    tmp: varchar('tmp', { length: 20 }),
    tmic: varchar('tmic', { length: 20 }),
    tmia: varchar('tmia', { length: 20 }),
    at20s: integer('at20s'),
    at60s: integer('at60s'),
    percentual: numeric('percentual', { precision: 6, scale: 2 }),
    periodStartDate: date('period_start_date'),
    periodEndDate: date('period_end_date'),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('omnichannel_workspace_id_idx').on(table.workspaceId),
    index('omnichannel_period_idx').on(table.periodYear, table.periodMonth),
    index('omnichannel_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
    index('omnichannel_agente_idx').on(table.agente),
  ]
);

/**
 * Resumo agregado de atendimentos do Omni Vendas por agente.
 * Alimentado pela planilha Omni (serviço = Vendas) — estrutura diferente do Matrix Go.
 * Um registro por agente por lote de importação.
 */
export const omnichannelSalesRecords = pgTable(
  'omnichannel_sales_records',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'),
    agente: varchar('agente', { length: 255 }).notNull(),
    quantidade: integer('quantidade').default(0).notNull(),
    /** TMA médio (HH:MM:SS) */
    tma: varchar('tma', { length: 20 }),
    /** Tempo em fila médio (HH:MM:SS) */
    tempoFila: varchar('tempo_fila', { length: 20 }),
    /** Tempo de atendimento médio (HH:MM:SS) */
    tempoAtendimento: varchar('tempo_atendimento', { length: 20 }),
    /** Tempo em pendência médio (HH:MM:SS) */
    tempoPendencia: varchar('tempo_pendencia', { length: 20 }),
    /** TMIC médio (HH:MM:SS) */
    tmic: varchar('tmic', { length: 20 }),
    /** TMIA médio (HH:MM:SS) */
    tmia: varchar('tmia', { length: 20 }),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('omnichannel_sales_workspace_idx').on(table.workspaceId),
    index('omnichannel_sales_period_idx').on(table.periodYear, table.periodMonth),
    index('omnichannel_sales_ws_period_idx').on(table.workspaceId, table.periodYear, table.periodMonth),
    index('omnichannel_sales_agente_idx').on(table.agente),
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

export const slaTargets = pgTable(
  'sla_targets',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    // TODO: after migration, drop the global unique and replace with uniqueIndex on (workspaceId, activityType)
    activityType: activityTypeEnum('activity_type').notNull(),
    targetHours: integer('target_hours'),
  },
  (table) => [
    index('sla_target_workspace_id_idx').on(table.workspaceId),
    index('sla_target_activity_type_idx').on(table.activityType),
  ]
);

/**
 * Configurações do cálculo SLA (horário comercial).
 * Chaves: weekday_open, weekday_close, saturday_enabled,
 *         saturday_open, saturday_close, sunday_enabled
 */
export const slaConfig = pgTable(
  'sla_config',
  {
    // Composite PK: (workspaceId, key) — workspaceId nullable during migration
    workspaceId: uuid('workspace_id'), // nullable during migration
    key:       varchar('key', { length: 100 }).notNull(),
    value:     text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('sla_config_workspace_id_idx').on(table.workspaceId),
    // TODO: after migration make (workspaceId, key) the PK and drop the legacy single-key PK
    uniqueIndex('sla_config_ws_key_idx').on(table.workspaceId, table.key),
  ]
);

// ========== MÓDULO DE IMPORTAÇÃO (novo) ==========

/** Lote de importação: metadados de cada upload */
export const lotesImportacao = pgTable(
  'lotes_importacao',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
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
  },
  (table) => [
    index('lote_importacao_workspace_id_idx').on(table.workspaceId),
    index('lote_importacao_status_idx').on(table.status),
  ]
);

/** Linhas brutas preservadas para auditoria */
export const importacoesBrutas = pgTable(
  'importacoes_brutas',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration
    loteImportacaoId: integer('lote_importacao_id').references(() => lotesImportacao.id),
    /**
     * Current strategy: preserve the full raw payload indefinitely for audit/reprocessing safety.
     * TODO(next phase): define retention, archival or purge policy by workspace/import batch.
     */
    rawJson: jsonb('raw_json').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('importacao_bruta_workspace_id_idx').on(table.workspaceId),
    index('importacao_bruta_lote_idx').on(table.loteImportacaoId),
  ]
);

/**
 * @deprecated Naming legacy kept for production compatibility.
 * `atendimentos` remains the persisted operational contract; new technical abstractions should prefer English names around it.
 */
export const atendimentos = pgTable(
  'atendimentos',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id'), // nullable during migration

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
    index('atend_workspace_id_idx').on(t.workspaceId),
    // hash dedup scoped per workspace — prevents cross-workspace collision
    uniqueIndex('atend_ws_hash_idx').on(t.workspaceId, t.hashImportacao),
    index('atend_hash_idx').on(t.hashImportacao),
    index('atend_tecnico_id_idx').on(t.tecnicoId),
    index('atend_tipo_idx').on(t.tipo),
    index('atend_period_idx').on(t.periodYear, t.periodMonth),
    index('atend_abertura_at_idx').on(t.aberturaAt),
    index('atend_cidade_idx').on(t.cidade),
    index('atend_ws_period_idx').on(t.workspaceId, t.periodYear, t.periodMonth),
    index('atend_ws_tipo_idx').on(t.workspaceId, t.tipo),
  ]
);

// ========== PERMISSION SYSTEM ==========

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
    action: varchar('action', { length: 20 }).notNull(), // 'read' | 'write'
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

export type SlaConfig = typeof slaConfig.$inferSelect;

// ========== TYPES ==========

export type Technician = typeof technicians.$inferSelect;
export type NewTechnician = typeof technicians.$inferInsert;
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
export type SalesReferralRecord = typeof salesReferralRecords.$inferSelect;
export type NewSalesReferralRecord = typeof salesReferralRecords.$inferInsert;
export type CancellationRecord = typeof cancellationRecords.$inferSelect;
export type NewCancellationRecord = typeof cancellationRecords.$inferInsert;
export type InfrastructureRecord = typeof infrastructureRecords.$inferSelect;
export type NewInfrastructureRecord = typeof infrastructureRecords.$inferInsert;
export type OmnichannelRecord = typeof omnichannelRecords.$inferSelect;
export type NewOmnichannelRecord = typeof omnichannelRecords.$inferInsert;
export type OmnichannelSalesRecord = typeof omnichannelSalesRecords.$inferSelect;
export type NewOmnichannelSalesRecord = typeof omnichannelSalesRecords.$inferInsert;
export type Holiday = typeof holidays.$inferSelect;
export type ActivityType = typeof activityTypeEnum.enumValues[number];
export type QualityIndicator = typeof qualityIndicatorEnum.enumValues[number];
export type SalesRecordType = typeof salesRecordTypeEnum.enumValues[number];
export type SalesReferralStatus = typeof salesReferralStatusEnum.enumValues[number];
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

// ========== MULTI-WORKSPACE ==========

export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', [
  'ADMIN',
  'MEMBER',
  'VIEWER',
]);

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
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

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceMemberRole = typeof workspaceMemberRoleEnum.enumValues[number];
