import { sql } from 'drizzle-orm';
import { getInfraDb } from '@/lib/db/infra';

export async function ensureServiceListingsTable() {
  const db = getInfraDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_listings (
      id SERIAL PRIMARY KEY,
      reference_date DATE NOT NULL,
      priority VARCHAR(10),
      technology VARCHAR(10),
      city_area VARCHAR(150),
      address TEXT,
      location_url TEXT,
      network_box VARCHAR(255),
      problem TEXT,
      tipo_ocorrencia VARCHAR(255),
      observacao_infra TEXT,
      status VARCHAR(50) DEFAULT 'pendente',
      occurrence_created BOOLEAN DEFAULT false,
      technician VARCHAR(255),
      solution TEXT,
      resolution_date DATE,
      resolution_notes TEXT,
      created_by VARCHAR(255),
      resolved_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS location_url TEXT
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS tipo_ocorrencia VARCHAR(255)
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS observacao_infra TEXT
  `);

  await db.execute(sql`
    UPDATE service_listings
    SET tipo_ocorrencia = COALESCE(NULLIF(tipo_ocorrencia, ''), 'CA sem sinal')
    WHERE tipo_ocorrencia IS NULL OR tipo_ocorrencia = ''
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ALTER COLUMN tipo_ocorrencia SET NOT NULL
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS foto_url TEXT
  `);
}
