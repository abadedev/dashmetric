import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.response) return result.response;

  try {
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

    return NextResponse.json({ ok: true, message: 'Tabela service_listings criada (ou j\u00E1 existia).' });
  } catch (error) {
    console.error('[infra/setup]', error);
    return NextResponse.json({ error: 'Falha ao criar a tabela no banco INFRA.' }, { status: 500 });
  }
}
