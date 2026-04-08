CREATE TYPE "public"."sales_referral_status" AS ENUM('contratado', 'pendente', 'reprovado');
--> statement-breakpoint
CREATE TABLE "sales_referral_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"cadastro_at" timestamp,
	"indicante" varchar(255),
	"indicado" varchar(255),
	"contratado" varchar(255),
	"telefone_indicado" varchar(50),
	"cidade" varchar(120),
	"status" "sales_referral_status" NOT NULL,
	"raw_status" varchar(120),
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sales_referral_workspace_idx" ON "sales_referral_records" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "sales_referral_status_idx" ON "sales_referral_records" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "sales_referral_city_idx" ON "sales_referral_records" USING btree ("cidade");
--> statement-breakpoint
CREATE INDEX "sales_referral_period_idx" ON "sales_referral_records" USING btree ("period_year","period_month");
--> statement-breakpoint
CREATE INDEX "sales_referral_ws_period_idx" ON "sales_referral_records" USING btree ("workspace_id","period_year","period_month");
--> statement-breakpoint
CREATE INDEX "sales_referral_cadastro_idx" ON "sales_referral_records" USING btree ("cadastro_at");
