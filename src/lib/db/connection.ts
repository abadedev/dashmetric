import { AsyncLocalStorage } from 'async_hooks';
import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as globalSchemaModels from './schemas/global';
import * as schema from './schema';

// ── Pool ─────────────────────────────────────────────────────────────────────

const rawUrl = (process.env.DATABASE_URL ?? '').replace(/[&?]channel_binding=[^&]*/g, '');
const isDev = process.env.NODE_ENV === 'development';

export const pool = new Pool({
  connectionString: rawUrl,
  max: isDev ? 3 : 10,
  idleTimeoutMillis: isDev ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

// Default search_path: dstech schema first, then public.
// This ensures all workspace-scoped queries from existing code work
// for the Dstech workspace without any changes.
pool.on('connect', (client) => {
  client.query(`SET search_path = dstech, public`).catch(() => {
    // dstech schema may not exist yet during initial boot — ignore silently
  });
});

// ── Global db (public schema only — no search_path override) ─────────────────

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

// ── Workspace db context (AsyncLocalStorage) ──────────────────────────────────

// Stores the workspace-scoped drizzle instance for the current async call chain.
// When set, all calls to `db` from @/lib/db will use this instance.
export const workspaceDbAls = new AsyncLocalStorage<WorkspaceDb>();

// ── Workspace-scoped db factory ───────────────────────────────────────────────

export type WorkspaceDb = ReturnType<typeof drizzle<typeof schema, PoolClient>>;

/**
 * Returns a workspace-scoped db (connection with SET search_path).
 * Always call release() when done.
 */
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

/**
 * Runs fn() with the workspace db set in AsyncLocalStorage.
 * All service/analytics functions that use `import { db } from '@/lib/db'`
 * will automatically use the workspace-scoped db inside fn().
 *
 * Usage in API routes:
 *   return withWorkspaceDb(slug, () => someService());
 */
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
