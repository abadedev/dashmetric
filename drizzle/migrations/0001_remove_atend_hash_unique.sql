DROP INDEX IF EXISTS "atend_hash_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atend_hash_idx" ON "atendimentos" USING btree ("hash_importacao");
