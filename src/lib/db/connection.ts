import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as globalSchemaModels from './schemas/global';
import { normalizeConnectionString } from './normalize-connection-string';

const rawUrl = normalizeConnectionString(process.env.DATABASE_URL);
const isDev = process.env.NODE_ENV === 'development';

export const pool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 3 : 10,
  idleTimeoutMillis: isDev ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

const _globalPool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 2 : 5,
  idleTimeoutMillis: isDev ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

export const globalDb = drizzle(_globalPool, { schema: globalSchemaModels });
