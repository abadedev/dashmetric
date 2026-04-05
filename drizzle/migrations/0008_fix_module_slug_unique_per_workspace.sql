-- Migration: replace global slug/href unique indexes on system_modules
-- with per-workspace unique indexes, and backfill NULL workspace_id rows.
--
-- Context: migration 0003 created system_modules with a GLOBAL unique index on slug
-- and href. Migration 0007 added workspace_id as nullable. Existing rows kept
-- workspace_id = NULL, which means ensureDefaultModules() would find nothing for
-- a given workspaceId, attempt INSERTs, and hit the global unique constraint.
--
-- Fix:
--   1. Backfill NULL workspace_id on system_modules using the dstech workspace slug.
--   2. Drop the legacy global unique indexes.
--   3. Create new per-workspace unique indexes on (workspace_id, slug) and (workspace_id, href).

-- Step 1: backfill NULL workspace_id to the dstech workspace
UPDATE "system_modules"
SET "workspace_id" = w.id
FROM (SELECT id FROM "workspaces" WHERE slug = 'dstech' LIMIT 1) w
WHERE "system_modules"."workspace_id" IS NULL;

-- Step 2: drop the legacy global unique indexes
DROP INDEX IF EXISTS "system_module_slug_idx";
DROP INDEX IF EXISTS "system_module_href_idx";

-- Step 3: create per-workspace unique indexes
CREATE UNIQUE INDEX "system_module_ws_slug_idx" ON "system_modules" ("workspace_id", "slug");
CREATE UNIQUE INDEX "system_module_ws_href_idx" ON "system_modules" ("workspace_id", "href");
