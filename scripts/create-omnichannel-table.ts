/**
 * scripts/create-omnichannel-table.ts
 * Creates the omnichannel_records table if it doesn't exist.
 * Run with: npx tsx scripts/create-omnichannel-table.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { omnichannelRecords } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

async function main() {
  console.log('Criando tabela omnichannel_records...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "omnichannel_records" (
      "id" serial PRIMARY KEY NOT NULL,
      "workspace_id" uuid,
      "agente" varchar(255) NOT NULL,
      "is_human" boolean DEFAULT true NOT NULL,
      "quantidade" integer,
      "te" varchar(20),
      "tme" varchar(20),
      "ta" varchar(20),
      "tma" varchar(20),
      "tp" varchar(20),
      "tmp" varchar(20),
      "tmic" varchar(20),
      "tmia" varchar(20),
      "at20s" integer,
      "at60s" integer,
      "percentual" numeric(6, 2),
      "period_month" integer NOT NULL,
      "period_year" integer NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "omnichannel_workspace_id_idx" ON "omnichannel_records" ("workspace_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "omnichannel_period_idx" ON "omnichannel_records" ("period_year", "period_month")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "omnichannel_ws_period_idx" ON "omnichannel_records" ("workspace_id", "period_year", "period_month")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "omnichannel_agente_idx" ON "omnichannel_records" ("agente")`);

  console.log('✅ omnichannel_records criada com sucesso!');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
