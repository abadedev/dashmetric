-- Migration: drop legacy tables service_orders, import_batches and the import_status enum.
--
-- Context:
--   These tables were superseded by the canonical model:
--     service_orders  → atendimentos        (46 fields, hash dedup, lote tracking)
--     import_batches  → lotes_importacao     (jsonb errors, detailed audit counters)
--
--   No active API route reads or writes to service_orders or import_batches.
--   The services that used them (import-service.ts, ranking-service.ts) have been deleted.
--   import_status enum is used exclusively by import_batches and can be dropped with it.
--
-- Order matters: drop FK-dependent table first (service_orders → import_batches).

-- Step 1: drop indexes on service_orders
DROP INDEX IF EXISTS "so_workspace_id_idx";
DROP INDEX IF EXISTS "so_technician_idx";
DROP INDEX IF EXISTS "so_activity_type_idx";
DROP INDEX IF EXISTS "so_period_idx";
DROP INDEX IF EXISTS "so_city_idx";
DROP INDEX IF EXISTS "so_opened_at_idx";
DROP INDEX IF EXISTS "so_os_number_idx";
DROP INDEX IF EXISTS "so_ws_period_idx";

-- Step 2: drop service_orders (references import_batches via FK)
DROP TABLE IF EXISTS "service_orders";

-- Step 3: drop indexes on import_batches
DROP INDEX IF EXISTS "import_batch_workspace_id_idx";

-- Step 4: drop import_batches
DROP TABLE IF EXISTS "import_batches";

-- Step 5: drop the import_status enum (CASCADE removes any remaining column defaults or views)
DROP TYPE IF EXISTS "import_status" CASCADE;
