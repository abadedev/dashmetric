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

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS solicitante VARCHAR(255)
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ
  `);

  await db.execute(sql`
    ALTER TABLE service_listings
    ADD COLUMN IF NOT EXISTS sla_status VARCHAR(20)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_listing_logs (
      id SERIAL PRIMARY KEY,
      service_listing_id INTEGER NOT NULL,
      field_name VARCHAR(64) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by VARCHAR(255),
      changed_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS service_listing_logs_service_listing_id_idx
      ON service_listing_logs (service_listing_id, changed_at DESC)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS service_listings_network_box_idx
      ON service_listings (network_box)
  `);
}
