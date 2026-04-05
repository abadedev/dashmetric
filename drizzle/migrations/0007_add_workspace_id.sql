-- Phase 1: Add workspace_id to all domain/operational tables
-- Columns are nullable during migration; NOT NULL + FK will be added after data backfill.

-- technicians
ALTER TABLE "technicians" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "tech_workspace_id_idx" ON "technicians" ("workspace_id");

-- import_batches
ALTER TABLE "import_batches" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "import_batch_workspace_id_idx" ON "import_batches" ("workspace_id");

-- service_orders
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "so_workspace_id_idx" ON "service_orders" ("workspace_id");
CREATE INDEX IF NOT EXISTS "so_ws_period_idx" ON "service_orders" ("workspace_id", "period_year", "period_month");

-- quality_records
ALTER TABLE "quality_records" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "qr_workspace_id_idx" ON "quality_records" ("workspace_id");
CREATE INDEX IF NOT EXISTS "qr_ws_period_idx" ON "quality_records" ("workspace_id", "period_year", "period_month");

-- support_records
ALTER TABLE "support_records" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "sr_workspace_id_idx" ON "support_records" ("workspace_id");
CREATE INDEX IF NOT EXISTS "sr_ws_period_idx" ON "support_records" ("workspace_id", "period_year", "period_month");

-- support_call_categories
ALTER TABLE "support_call_categories" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "scc_workspace_id_idx" ON "support_call_categories" ("workspace_id");
CREATE INDEX IF NOT EXISTS "scc_ws_period_idx" ON "support_call_categories" ("workspace_id", "period_year", "period_month");

-- system_modules
ALTER TABLE "system_modules" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "system_module_workspace_id_idx" ON "system_modules" ("workspace_id");

-- sales_records
ALTER TABLE "sales_records" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "sales_record_workspace_id_idx" ON "sales_records" ("workspace_id");
CREATE INDEX IF NOT EXISTS "sales_record_ws_period_idx" ON "sales_records" ("workspace_id", "period_year", "period_month");

-- cancellation_records
ALTER TABLE "cancellation_records" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "cancellation_record_workspace_id_idx" ON "cancellation_records" ("workspace_id");
CREATE INDEX IF NOT EXISTS "cancellation_record_ws_period_idx" ON "cancellation_records" ("workspace_id", "period_year", "period_month");

-- infrastructure_records
ALTER TABLE "infrastructure_records" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "infrastructure_record_workspace_id_idx" ON "infrastructure_records" ("workspace_id");
CREATE INDEX IF NOT EXISTS "infrastructure_record_ws_period_idx" ON "infrastructure_records" ("workspace_id", "period_year", "period_month");

-- sla_targets
-- Drop the legacy global unique on activity_type; workspace-scoped unique will come after data migration
ALTER TABLE "sla_targets" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "sla_target_workspace_id_idx" ON "sla_targets" ("workspace_id");
CREATE INDEX IF NOT EXISTS "sla_target_activity_type_idx" ON "sla_targets" ("activity_type");

-- sla_config
-- Change PK from single key to composite (workspace_id, key); nullable during migration
-- Step 1: add column
ALTER TABLE "sla_config" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "sla_config_workspace_id_idx" ON "sla_config" ("workspace_id");
-- Note: unique index on (workspace_id, key) will be added after data migration and PK change

-- lotes_importacao
ALTER TABLE "lotes_importacao" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "lote_importacao_workspace_id_idx" ON "lotes_importacao" ("workspace_id");
CREATE INDEX IF NOT EXISTS "lote_importacao_status_idx" ON "lotes_importacao" ("status");

-- importacoes_brutas
ALTER TABLE "importacoes_brutas" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "importacao_bruta_workspace_id_idx" ON "importacoes_brutas" ("workspace_id");
CREATE INDEX IF NOT EXISTS "importacao_bruta_lote_idx" ON "importacoes_brutas" ("lote_importacao_id");

-- atendimentos
ALTER TABLE "atendimentos" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
CREATE INDEX IF NOT EXISTS "atend_workspace_id_idx" ON "atendimentos" ("workspace_id");
CREATE INDEX IF NOT EXISTS "atend_ws_period_idx" ON "atendimentos" ("workspace_id", "period_year", "period_month");
CREATE INDEX IF NOT EXISTS "atend_ws_tipo_idx" ON "atendimentos" ("workspace_id", "tipo");
-- Scoped dedup index: unique hash per workspace (replaces global unique when workspaceId is populated)
-- Note: this will only work as a unique constraint after all rows have workspace_id populated.
-- For now just create the index without UNIQUE to avoid breaking existing rows with null workspace_id.
CREATE INDEX IF NOT EXISTS "atend_ws_hash_idx" ON "atendimentos" ("workspace_id", "hash_importacao");
