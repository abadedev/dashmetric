CREATE TABLE IF NOT EXISTS "dropdown_options" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" varchar(100) NOT NULL,
  "value" varchar(255) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "dropdown_options_category_idx" ON "dropdown_options" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "dropdown_options_category_value_idx" ON "dropdown_options" ("category","value");
