import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Remove parâmetros não suportados pelo driver pg (ex: channel_binding)
const rawUrl = (process.env.DATABASE_URL ?? '').replace(/[&?]channel_binding=[^&]*/g, '');

const isDev = process.env.NODE_ENV === 'development';

const pool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 3 : 10,          // em dev, 3 conexões são suficientes
  idleTimeoutMillis: isDev ? 5000 : 30000,   // libera conexões ociosas mais rápido em dev
  connectionTimeoutMillis: 10000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});



export const db = drizzle(pool, { schema });
export type DB = typeof db;
