-- Adiciona campo technician_name na tabela quality_records
-- Necessário para remover MongoDB: o campo technicianName existia no documento MongoDB
-- mas não existia na tabela PostgreSQL correspondente.
ALTER TABLE "quality_records" ADD COLUMN IF NOT EXISTS "technician_name" varchar(255);
