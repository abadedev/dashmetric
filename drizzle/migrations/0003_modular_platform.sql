CREATE TYPE "public"."sales_record_type" AS ENUM('negociado', 'fechado', 'lead_marketing', 'pedido_instalado', 'pedido_cancelado');

CREATE TABLE "system_modules" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "icon" varchar(50) NOT NULL,
  "href" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "show_in_sidebar" boolean DEFAULT true NOT NULL,
  "allow_import" boolean DEFAULT false NOT NULL,
  "required_role" "role" DEFAULT 'user' NOT NULL,
  "template_source" varchar(120),
  "is_editable" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "module_import_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "module_id" integer NOT NULL,
  "profile_key" varchar(120) NOT NULL,
  "label" varchar(255) NOT NULL,
  "detector_type" varchar(120) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "sales_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "record_type" "sales_record_type" NOT NULL,
  "client_name" varchar(255),
  "city" varchar(120),
  "source" varchar(120),
  "indication" varchar(255),
  "plan" varchar(255),
  "observation" text,
  "requested_at" timestamp,
  "installed_at" timestamp,
  "period_month" integer NOT NULL,
  "period_year" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "cancellation_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_name" varchar(255),
  "city" varchar(120),
  "reason" text,
  "source" varchar(120),
  "plan" varchar(255),
  "observation" text,
  "cancelled_at" timestamp,
  "period_month" integer NOT NULL,
  "period_year" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "infrastructure_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255),
  "category" varchar(120),
  "city" varchar(120),
  "reference_date" timestamp,
  "payload" jsonb,
  "period_month" integer,
  "period_year" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "module_import_profiles"
ADD CONSTRAINT "module_import_profiles_module_id_system_modules_id_fk"
FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "system_module_slug_idx" ON "system_modules" USING btree ("slug");
CREATE UNIQUE INDEX "system_module_href_idx" ON "system_modules" USING btree ("href");
CREATE INDEX "system_module_sort_idx" ON "system_modules" USING btree ("sort_order");

CREATE UNIQUE INDEX "module_import_profile_key_idx" ON "module_import_profiles" USING btree ("module_id", "profile_key");
CREATE INDEX "module_import_profile_module_idx" ON "module_import_profiles" USING btree ("module_id");

CREATE INDEX "sales_record_period_idx" ON "sales_records" USING btree ("period_year", "period_month");
CREATE INDEX "sales_record_type_idx" ON "sales_records" USING btree ("record_type");
CREATE INDEX "sales_record_city_idx" ON "sales_records" USING btree ("city");

CREATE INDEX "cancellation_record_period_idx" ON "cancellation_records" USING btree ("period_year", "period_month");
CREATE INDEX "cancellation_record_city_idx" ON "cancellation_records" USING btree ("city");

CREATE INDEX "infrastructure_record_period_idx" ON "infrastructure_records" USING btree ("period_year", "period_month");
CREATE INDEX "infrastructure_record_city_idx" ON "infrastructure_records" USING btree ("city");
