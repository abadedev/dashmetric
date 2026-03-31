CREATE TYPE "public"."activity_type" AS ENUM('instalacao_nova', 'instalacao_reativacao', 'reparo', 'mudanca_endereco', 'retirada_kit', 'mudanca_plano', 'retorno', 'cancelado_reparo', 'cancelado_retirada_kit', 'cancelado_mudanca_endereco', 'cancelado_retorno', 'cancelado_reativacao_login');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."quality_indicator" AS ENUM('IQIv', 'IQRv', 'RTV', 'RST', 'ICT', 'Retorno');--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_os" varchar(50),
	"tipo" varchar(100) NOT NULL,
	"motivo" text,
	"solucao" text,
	"tecnico" varchar(255),
	"tecnico_id" integer,
	"cliente" varchar(255),
	"cidade" varchar(100),
	"plano" varchar(255),
	"data_abertura" varchar(10),
	"hora_abertura" varchar(8),
	"data_finalizacao" varchar(10),
	"hora_finalizacao" varchar(8),
	"abertura_at" timestamp,
	"finalizacao_at" timestamp,
	"intervalo" varchar(50),
	"sla_horas" numeric(6, 2),
	"dentro_sla" boolean,
	"sla_corrido_segundos" integer,
	"sla_util_segundos" integer,
	"dentro_sla_util" boolean,
	"login" varchar(100),
	"endereco" text,
	"bairro" varchar(100),
	"referencia" text,
	"atendente" varchar(255),
	"indicacao" varchar(255),
	"mac" varchar(20),
	"ativo" varchar(5),
	"empresa" varchar(255),
	"data_liberada" varchar(50),
	"observacao" text,
	"coordenadas" varchar(100),
	"telefones" varchar(255),
	"agendamento" varchar(100),
	"hash_importacao" varchar(64) NOT NULL,
	"lote_importacao_id" integer,
	"period_month" integer,
	"period_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" varchar(255) NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"total_rows" integer DEFAULT 0,
	"imported_rows" integer DEFAULT 0,
	"errors" integer DEFAULT 0,
	"error_details" text,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importacoes_brutas" (
	"id" serial PRIMARY KEY NOT NULL,
	"lote_importacao_id" integer,
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes_importacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"arquivo" varchar(255) NOT NULL,
	"tipo_arquivo" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"total_lidas" integer DEFAULT 0,
	"total_validas" integer DEFAULT 0,
	"total_invalidas" integer DEFAULT 0,
	"total_inseridas" integer DEFAULT 0,
	"total_duplicadas" integer DEFAULT 0,
	"erros" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_number" varchar(20),
	"indicator" "quality_indicator" NOT NULL,
	"reason" text,
	"solution" text,
	"technician_id" integer,
	"client_name" varchar(255),
	"city" varchar(100),
	"plan" varchar(255),
	"opened_at" timestamp,
	"closed_at" timestamp,
	"duration_seconds" integer,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_number" varchar(20),
	"activity_type" "activity_type" NOT NULL,
	"reason" text,
	"solution" text,
	"technician_id" integer,
	"client_name" varchar(255),
	"city" varchar(100),
	"plan" varchar(255),
	"opened_at" timestamp,
	"closed_at" timestamp,
	"sla_target_hours" integer,
	"sla_corrido_seconds" integer,
	"sla_util_seconds" integer,
	"within_sla_corrido" boolean,
	"within_sla_util" boolean,
	"import_batch_id" integer,
	"period_month" integer,
	"period_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"target_hours" integer,
	CONSTRAINT "sla_targets_activity_type_unique" UNIQUE("activity_type")
);
--> statement-breakpoint
CREATE TABLE "support_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"attendant_name" varchar(255) NOT NULL,
	"opened_manut_ext" integer DEFAULT 0,
	"percentage" numeric(5, 2),
	"without_manut" integer DEFAULT 0,
	"total" integer DEFAULT 0,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"login" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_tecnico_id_technicians_id_fk" FOREIGN KEY ("tecnico_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_lote_importacao_id_lotes_importacao_id_fk" FOREIGN KEY ("lote_importacao_id") REFERENCES "public"."lotes_importacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacoes_brutas" ADD CONSTRAINT "importacoes_brutas_lote_importacao_id_lotes_importacao_id_fk" FOREIGN KEY ("lote_importacao_id") REFERENCES "public"."lotes_importacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_records" ADD CONSTRAINT "quality_records_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "atend_hash_idx" ON "atendimentos" USING btree ("hash_importacao");--> statement-breakpoint
CREATE INDEX "atend_tecnico_id_idx" ON "atendimentos" USING btree ("tecnico_id");--> statement-breakpoint
CREATE INDEX "atend_tipo_idx" ON "atendimentos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "atend_period_idx" ON "atendimentos" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "atend_abertura_at_idx" ON "atendimentos" USING btree ("abertura_at");--> statement-breakpoint
CREATE INDEX "atend_cidade_idx" ON "atendimentos" USING btree ("cidade");--> statement-breakpoint
CREATE UNIQUE INDEX "holiday_date_idx" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "qr_indicator_idx" ON "quality_records" USING btree ("indicator");--> statement-breakpoint
CREATE INDEX "qr_technician_idx" ON "quality_records" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "qr_period_idx" ON "quality_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "so_technician_idx" ON "service_orders" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "so_activity_type_idx" ON "service_orders" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "so_period_idx" ON "service_orders" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "so_city_idx" ON "service_orders" USING btree ("city");--> statement-breakpoint
CREATE INDEX "so_opened_at_idx" ON "service_orders" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "so_os_number_idx" ON "service_orders" USING btree ("os_number");--> statement-breakpoint
CREATE INDEX "sr_period_idx" ON "support_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "tech_name_idx" ON "technicians" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tech_login_idx" ON "technicians" USING btree ("login");