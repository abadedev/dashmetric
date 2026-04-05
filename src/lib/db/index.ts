/**
 * Primary db export backed by the shared pool on `public`.
 * Workspace isolation must happen through explicit `workspaceId` filters.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { pool } from './connection';

export const db = drizzle(pool, { schema });

export type DB = typeof db;

export { pool };
export { globalDb } from './connection';
