import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as globalSchemaModels from './schemas/global';
import { getRequiredEnv } from '@/lib/env';
import { normalizeConnectionString } from './normalize-connection-string';

const rawUrl = normalizeConnectionString(getRequiredEnv('DATABASE_URL'));
const isDev = process.env.NODE_ENV === 'development';

const isNeon = rawUrl.includes('neon.tech');
const sslConfig = isNeon ? { rejectUnauthorized: false } : false;

export const pool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 3 : 10,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
  ssl: sslConfig,
});
pool.on('error', (err) => console.error('[pg pool] idle client error:', err));

const _globalPool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 2 : 5,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
  ssl: sslConfig,
});
_globalPool.on('error', (err) => console.error('[pg globalPool] idle client error:', err));

export const globalDb = drizzle(_globalPool, { schema: globalSchemaModels });
