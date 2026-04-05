import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Administrador DSTECH';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'abade.ltd@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123456!';
const WORKSPACE_NAME = process.env.ADMIN_WORKSPACE_NAME ?? 'DSTECH';
const WORKSPACE_SLUG = process.env.ADMIN_WORKSPACE_SLUG ?? 'dstech';

const rawUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!rawUrl) {
  throw new Error('DATABASE_URL não definido');
}

const pool = new Pool({
  connectionString: rawUrl,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

function createId(size = 24) {
  return randomBytes(size).toString('base64url');
}

async function ensureAdminUser(client: Awaited<ReturnType<Pool['connect']>>) {
  const existingUser = await client.query<{
    id: string;
    role: string;
  }>(
    `select id, role from public."user" where email = $1 limit 1`,
    [ADMIN_EMAIL]
  );

  if (existingUser.rows[0]) {
    await client.query(
      `update public."user"
       set name = $2, role = 'admin', updated_at = now()
       where id = $1`,
      [existingUser.rows[0].id, ADMIN_NAME]
    );
    return existingUser.rows[0].id;
  }

  const userId = createId();
  const accountId = createId();
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await client.query(
    `insert into public."user"
      (id, name, email, email_verified, image, role, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, 'admin', now(), now())`,
    [userId, ADMIN_NAME, ADMIN_EMAIL, true, null]
  );

  await client.query(
    `insert into public.account
      (id, account_id, provider_id, user_id, password, created_at, updated_at)
     values
      ($1, $2, 'credential', $3, $4, now(), now())`,
    [accountId, userId, userId, passwordHash]
  );

  return userId;
}

async function ensureWorkspace(client: Awaited<ReturnType<Pool['connect']>>, adminUserId: string) {
  const existingWorkspace = await client.query<{ id: string }>(
    `select id from public.workspaces where slug = $1 limit 1`,
    [WORKSPACE_SLUG]
  );

  if (existingWorkspace.rows[0]) {
    return existingWorkspace.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `insert into public.workspaces
      (name, slug, created_by, is_active, created_at)
     values
      ($1, $2, $3, true, now())
     returning id`,
    [WORKSPACE_NAME, WORKSPACE_SLUG, adminUserId]
  );

  return created.rows[0]!.id;
}

async function ensureMembership(client: Awaited<ReturnType<Pool['connect']>>, workspaceId: string, adminUserId: string) {
  const existingMembership = await client.query<{ id: string }>(
    `select id
     from public.workspace_members
     where workspace_id = $1 and user_id = $2
     limit 1`,
    [workspaceId, adminUserId]
  );

  if (existingMembership.rows[0]) {
    await client.query(
      `update public.workspace_members
       set role = 'ADMIN', granted_by = $2, granted_at = now()
       where id = $1`,
      [existingMembership.rows[0].id, adminUserId]
    );
    return;
  }

  await client.query(
    `insert into public.workspace_members
      (id, workspace_id, user_id, role, granted_by, granted_at)
     values
      (gen_random_uuid(), $1, $2, 'ADMIN', $2, now())`,
    [workspaceId, adminUserId]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminUserId = await ensureAdminUser(client);
    const workspaceId = await ensureWorkspace(client, adminUserId);
    await ensureMembership(client, workspaceId, adminUserId);

    await client.query('COMMIT');

    console.log('Admin pronto.');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Senha: ${ADMIN_PASSWORD}`);
    console.log(`Workspace: ${WORKSPACE_SLUG}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao criar admin:', error);
  process.exit(1);
});
