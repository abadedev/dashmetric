CREATE TABLE "omnichannel_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"agente" varchar(255) NOT NULL,
	"is_human" boolean DEFAULT true NOT NULL,
	"quantidade" integer,
	"te" varchar(20),
	"tme" varchar(20),
	"ta" varchar(20),
	"tma" varchar(20),
	"tp" varchar(20),
	"tmp" varchar(20),
	"tmic" varchar(20),
	"tmia" varchar(20),
	"at20s" integer,
	"at60s" integer,
	"percentual" numeric(6, 2),
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "omnichannel_workspace_id_idx" ON "omnichannel_records" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "omnichannel_period_idx" ON "omnichannel_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "omnichannel_ws_period_idx" ON "omnichannel_records" USING btree ("workspace_id","period_year","period_month");--> statement-breakpoint
CREATE INDEX "omnichannel_agente_idx" ON "omnichannel_records" USING btree ("agente");
