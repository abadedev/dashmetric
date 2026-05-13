CREATE TABLE IF NOT EXISTS "infra_sla_config" (
  "id" serial PRIMARY KEY NOT NULL,
  "prioridade" integer NOT NULL UNIQUE,
  "label" varchar(50) NOT NULL,
  "meta_horas" integer NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" varchar(255)
);
--> statement-breakpoint
INSERT INTO "infra_sla_config" ("prioridade", "label", "meta_horas") VALUES
  (1, 'Alta', 24),
  (2, 'Média', 72),
  (3, 'Baixa', 72)
ON CONFLICT ("prioridade") DO NOTHING;
