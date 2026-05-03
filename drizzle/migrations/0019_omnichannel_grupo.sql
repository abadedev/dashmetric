ALTER TABLE "omnichannel_records" ADD COLUMN "grupo" varchar(50) DEFAULT 'geral' NOT NULL;
--> statement-breakpoint
CREATE INDEX "omnichannel_grupo_idx" ON "omnichannel_records" USING btree ("grupo");
--> statement-breakpoint
CREATE INDEX "omnichannel_ws_grupo_period_idx" ON "omnichannel_records" USING btree ("workspace_id","grupo","period_year","period_month");
