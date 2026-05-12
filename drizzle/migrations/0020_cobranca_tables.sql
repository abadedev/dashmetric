CREATE TABLE IF NOT EXISTS "cobranca_registros" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" varchar(100) NOT NULL DEFAULT 'default',
  "cliente_nome" varchar(255) NOT NULL,
  "cliente_codigo" varchar(50),
  "telefone" varchar(50),
  "cidade" varchar(100),
  "vencimento" timestamp,
  "valor" numeric(10,2),
  "status_sistema" varchar(50),
  "motivo_atraso" varchar(100),
  "perfil_atraso" boolean,
  "tempo_de_casa" varchar(50),
  "data_pagamento" timestamp,
  "data_bloqueio" timestamp,
  "data_inativo" timestamp,
  "status_crm" varchar(50) NOT NULL DEFAULT 'pendente',
  "observacao" text,
  "meio_contato" varchar(100),
  "tipo_lista" varchar(30) NOT NULL,
  "import_id" integer,
  "linha_cor" varchar(20),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cobranca_imports" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" varchar(100) NOT NULL DEFAULT 'default',
  "tipo_lista" varchar(30) NOT NULL,
  "nome_arquivo" varchar(255),
  "total_registros" integer DEFAULT 0,
  "inseridos" integer DEFAULT 0,
  "atualizados" integer DEFAULT 0,
  "ignorados" integer DEFAULT 0,
  "importado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cobranca_workspace_idx" ON "cobranca_registros" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cobranca_status_crm_idx" ON "cobranca_registros" ("status_crm");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cobranca_tipo_lista_idx" ON "cobranca_registros" ("tipo_lista");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cobranca_vencimento_idx" ON "cobranca_registros" ("vencimento");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cobranca_cidade_idx" ON "cobranca_registros" ("cidade");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cobranca_unique_idx" ON "cobranca_registros" ("cliente_codigo", "vencimento", "tipo_lista");
