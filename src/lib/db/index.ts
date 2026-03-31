import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Remove parâmetros não suportados pelo driver pg (ex: channel_binding)
const rawUrl = (process.env.DATABASE_URL ?? '').replace(/[&?]channel_binding=[^&]*/g, '');

const pool = new Pool({
  connectionString: rawUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});



export const db = drizzle(pool, { schema });
export type DB = typeof db;
