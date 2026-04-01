ALTER TABLE "sales_records"
ADD COLUMN IF NOT EXISTS "origin_sector" varchar(50) DEFAULT 'vendas' NOT NULL;

ALTER TABLE "sales_records"
ADD COLUMN IF NOT EXISTS "csv_category" varchar(50) DEFAULT 'padrao' NOT NULL;

ALTER TABLE "cancellation_records"
ADD COLUMN IF NOT EXISTS "origin_sector" varchar(50) DEFAULT 'retencao' NOT NULL;

CREATE INDEX IF NOT EXISTS "sales_record_origin_sector_idx"
ON "sales_records" USING btree ("origin_sector");

CREATE INDEX IF NOT EXISTS "sales_record_csv_category_idx"
ON "sales_records" USING btree ("csv_category");

CREATE INDEX IF NOT EXISTS "cancellation_record_origin_sector_idx"
ON "cancellation_records" USING btree ("origin_sector");
