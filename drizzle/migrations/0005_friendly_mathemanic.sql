CREATE TYPE "public"."sales_record_type" AS ENUM('negociado', 'fechado', 'lead_marketing', 'pedido_instalado', 'pedido_cancelado');--> statement-breakpoint
CREATE TABLE "access_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellation_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"origin_sector" varchar(50) DEFAULT 'retencao' NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "group_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "module_import_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"profile_key" varchar(120) NOT NULL,
	"label" varchar(255) NOT NULL,
	"detector_type" varchar(120) NOT NULL,
	"parameters" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"module_slug" varchar(120) NOT NULL,
	"action" varchar(20) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sales_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_type" "sales_record_type" NOT NULL,
	"origin_sector" varchar(50) DEFAULT 'vendas' NOT NULL,
	"csv_category" varchar(50) DEFAULT 'padrao' NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "sla_config" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_call_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria" varchar(200) NOT NULL,
	"quantidade" integer NOT NULL,
	"percentual" numeric(6, 2) NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"group_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quality_records" ADD COLUMN "technician_name" varchar(255);--> statement-breakpoint
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_group_id_access_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."access_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_import_profiles" ADD CONSTRAINT "module_import_profiles_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_access_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."access_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cancellation_record_period_idx" ON "cancellation_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "cancellation_record_city_idx" ON "cancellation_records" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "group_permission_unique_idx" ON "group_permissions" USING btree ("group_id","permission_id");--> statement-breakpoint
CREATE INDEX "infrastructure_record_period_idx" ON "infrastructure_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "infrastructure_record_city_idx" ON "infrastructure_records" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "module_import_profile_key_idx" ON "module_import_profiles" USING btree ("module_id","profile_key");--> statement-breakpoint
CREATE INDEX "module_import_profile_module_idx" ON "module_import_profiles" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_key_idx" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "permission_module_slug_idx" ON "permissions" USING btree ("module_slug");--> statement-breakpoint
CREATE INDEX "sales_record_period_idx" ON "sales_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "sales_record_type_idx" ON "sales_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "sales_record_city_idx" ON "sales_records" USING btree ("city");--> statement-breakpoint
CREATE INDEX "scc_period_idx" ON "support_call_categories" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "system_module_slug_idx" ON "system_modules" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "system_module_href_idx" ON "system_modules" USING btree ("href");--> statement-breakpoint
CREATE INDEX "system_module_sort_idx" ON "system_modules" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "user_group_unique_idx" ON "user_groups" USING btree ("user_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permission_unique_idx" ON "user_permissions" USING btree ("user_id","permission_id");