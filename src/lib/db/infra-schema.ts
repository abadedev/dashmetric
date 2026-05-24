import { boolean, date, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const serviceListings = pgTable('service_listings', {
  id: serial('id').primaryKey(),
  referenceDate: date('reference_date').notNull(),
  priority: varchar('priority', { length: 10 }),
  technology: varchar('technology', { length: 10 }),
  cityArea: varchar('city_area', { length: 150 }),
  address: text('address'),
  locationUrl: text('location_url'),
  networkBox: varchar('network_box', { length: 255 }),
  problem: text('problem'),
  tipoOcorrencia: varchar('tipo_ocorrencia', { length: 255 }).notNull(),
  observacaoInfra: text('observacao_infra'),
  status: varchar('status', { length: 50 }).default('pendente'),
  occurrenceCreated: boolean('occurrence_created').default(false),
  technician: varchar('technician', { length: 255 }),
  solution: text('solution'),
  resolutionDate: date('resolution_date'),
  resolutionNotes: text('resolution_notes'),
  fotoUrl: text('foto_url'),
  solicitante: varchar('solicitante', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  slaStatus: varchar('sla_status', { length: 20 }),
  classificacao: varchar('classificacao', { length: 50 }),
});

export type ServiceListing = typeof serviceListings.$inferSelect;
export type NewServiceListing = typeof serviceListings.$inferInsert;

export type ServiceListingWithStats = ServiceListing & {
  occurrenceCount: number;
  isReincidente: boolean;
};

export const serviceListingLogs = pgTable('service_listing_logs', {
  id: serial('id').primaryKey(),
  serviceListingId: integer('service_listing_id').notNull(),
  fieldName: varchar('field_name', { length: 64 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: varchar('changed_by', { length: 255 }),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

export type ServiceListingLog = typeof serviceListingLogs.$inferSelect;
export type NewServiceListingLog = typeof serviceListingLogs.$inferInsert;
