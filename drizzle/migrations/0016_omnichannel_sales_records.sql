CREATE TABLE "omnichannel_sales_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"agente" varchar(255) NOT NULL,
	"quantidade" integer DEFAULT 0 NOT NULL,
	"tma" varchar(20),
	"tempo_fila" varchar(20),
	"tempo_atendimento" varchar(20),
	"tempo_pendencia" varchar(20),
	"tmic" varchar(20),
	"tmia" varchar(20),
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "omnichannel_sales_workspace_idx" ON "omnichannel_sales_records" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "omnichannel_sales_period_idx" ON "omnichannel_sales_records" USING btree ("period_year","period_month");
--> statement-breakpoint
CREATE INDEX "omnichannel_sales_ws_period_idx" ON "omnichannel_sales_records" USING btree ("workspace_id","period_year","period_month");
--> statement-breakpoint
CREATE INDEX "omnichannel_sales_agente_idx" ON "omnichannel_sales_records" USING btree ("agente");
