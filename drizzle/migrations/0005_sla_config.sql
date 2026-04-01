-- Tabela de configuração do cálculo SLA (horário comercial)
CREATE TABLE IF NOT EXISTS "sla_config" (
  "key"        varchar(100) PRIMARY KEY NOT NULL,
  "value"      text         NOT NULL,
  "updated_at" timestamp    DEFAULT now() NOT NULL
);

-- Valores padrão: Seg-Sex 08-18h, Sáb 08-12h, Dom fechado
INSERT INTO "sla_config" ("key", "value", "updated_at") VALUES
  ('weekday_open',      '8',     NOW()),
  ('weekday_close',     '18',    NOW()),
  ('saturday_enabled',  'true',  NOW()),
  ('saturday_open',     '8',     NOW()),
  ('saturday_close',    '12',    NOW()),
  ('sunday_enabled',    'false', NOW())
ON CONFLICT ("key") DO NOTHING;
