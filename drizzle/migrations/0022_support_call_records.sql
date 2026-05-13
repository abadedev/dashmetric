CREATE TABLE IF NOT EXISTS "support_call_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "os" varchar(20) NOT NULL UNIQUE,
  "period_month" integer NOT NULL,
  "period_year" integer NOT NULL,
  "data_abertura" timestamp,
  "data_fechamento" timestamp,
  "atendente" varchar(100),
  "cliente" varchar(150),
  "plano" varchar(100),
  "cidade" varchar(100),
  "bairro" varchar(100),
  "problema_reclamado" text,
  "motivo" text,
  "causa" text,
  "solucao" text,
  "obs" text,
  "segmento" varchar(20),
  "modelo_periodo" varchar(2) DEFAULT 'B',
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scr_period_idx" ON "support_call_records" ("period_year", "period_month");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scr_segmento_idx" ON "support_call_records" ("segmento");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scr_data_abertura_idx" ON "support_call_records" ("data_abertura");
