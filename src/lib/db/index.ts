/**
 * Primary db export — workspace-aware via AsyncLocalStorage.
 *
 * When code runs inside withWorkspaceDb(slug, fn), this `db` automatically
 * uses the workspace-scoped connection (SET search_path = "{slug}", public).
 *
 * Outside that context it falls back to the default pool whose connections
 * have SET search_path = dstech, public — preserving backward compatibility
 * for all existing single-workspace service/analytics code.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { pool, workspaceDbAls } from './connection';

// The "fallback" drizzle instance backed by the shared pool.
// The pool's connect event sets search_path = dstech, public.
const _defaultDb = drizzle(pool, { schema });

// Context-aware proxy: delegates ALL property accesses to the workspace db
// stored in AsyncLocalStorage when available, otherwise to _defaultDb.
export const db = new Proxy(_defaultDb, {
  get(target, prop, receiver) {
    const contextDb = workspaceDbAls.getStore();
    return Reflect.get(contextDb ?? target, prop, contextDb ?? receiver);
  },
}) as typeof _defaultDb;

export type DB = typeof db;

// Re-export pool for use in connection.ts and provision.ts
export { pool };

// Re-export globalDb and workspace utilities for explicit use
export { globalDb, getWorkspaceDb, withWorkspaceDb, workspaceDbAls } from './connection';
