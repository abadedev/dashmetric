import { AsyncLocalStorage } from 'async_hooks';
import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as globalSchemaModels from './schemas/global';
import * as schema from './schema';

const rawUrl = (process.env.DATABASE_URL ?? '').replace(/[&?]channel_binding=[^&]*/g, '');
const isDev = process.env.NODE_ENV === 'development';

export const pool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 3 : 10,
  idleTimeoutMillis: isDev ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

pool.on('connect', (client) => {
  client.query('SET search_path = dstech, public').catch(() => {
    // dstech schema may not exist yet during initial boot
  });
});

const _globalPool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 2 : 5,
  idleTimeoutMillis: isDev ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

_globalPool.on('connect', (client) => {
  client.query('SET search_path = public').catch(() => {
    // ignore connection-level search_path failures during bootstrap
  });
});

export const globalDb = drizzle(_globalPool, { schema: globalSchemaModels });

export const workspaceDbAls = new AsyncLocalStorage<WorkspaceDb>();

export type WorkspaceDb = ReturnType<typeof drizzle<typeof schema, PoolClient>>;

export async function getWorkspaceDb(workspaceSlug: string): Promise<{
  db: WorkspaceDb;
  release: () => void;
}> {
  const client = await pool.connect();
  await client.query(`SET search_path = "${workspaceSlug}", public`);
  const wsDb = drizzle(client, { schema });
  return {
    db: wsDb,
    release: () => client.release(),
  };
}

export async function withWorkspaceDb<T>(
  workspaceSlug: string,
  fn: (wsDb: WorkspaceDb) => Promise<T>
): Promise<T> {
  const { db: wsDb, release } = await getWorkspaceDb(workspaceSlug);
  try {
    return await new Promise<T>((resolve, reject) => {
      workspaceDbAls.run(wsDb, () => {
        fn(wsDb).then(resolve).catch(reject);
      });
    });
  } finally {
    release();
  }
}
