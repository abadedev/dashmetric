import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { holidays, slaTargets } from '../src/lib/db/schema';
import { workspaces } from '../src/lib/db/schemas/global';
import { eq } from 'drizzle-orm';
import { ensureDefaultModules } from '../src/lib/services/module-service';
import { resolveWorkspaceId } from '../src/lib/db/workspace-context';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

const rawUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!rawUrl) {
  throw new Error('DATABASE_URL não definido');
}

const ssl = rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false;

const globalPool = new Pool({
  connectionString: rawUrl,
  ssl,
});

async function ensurePublicGlobals() {
  const client = await globalPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET search_path = public');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.role AS ENUM ('user', 'editor', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.workspace_member_role AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.activity_type AS ENUM (
          'instalacao_nova',
          'instalacao_reativacao',
          'reparo',
          'mudanca_endereco',
          'retirada_kit',
          'mudanca_plano',
          'retorno',
          'cancelado_reparo',
          'cancelado_retirada_kit',
          'cancelado_mudanca_endereco',
          'cancelado_retorno',
          'cancelado_reativacao_login',
          'reparo_corporativo'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.quality_indicator AS ENUM ('IQIv', 'IQRv', 'RTV', 'RST', 'ICT', 'Retorno');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.sales_record_type AS ENUM (
          'negociado',
          'fechado',
          'lead_marketing',
          'pedido_instalado',
          'pedido_cancelado'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public."user" (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        email_verified boolean NOT NULL,
        image text,
        role public.role DEFAULT 'user' NOT NULL,
        created_at timestamp NOT NULL,
        updated_at timestamp NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.session (
        id text PRIMARY KEY,
        expires_at timestamp NOT NULL,
        token text NOT NULL UNIQUE,
        created_at timestamp NOT NULL,
        updated_at timestamp NOT NULL,
        ip_address text,
        user_agent text,
        user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.account (
        id text PRIMARY KEY,
        account_id text NOT NULL,
        provider_id text NOT NULL,
        user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        access_token text,
        refresh_token text,
        id_token text,
        access_token_expires_at timestamp,
        refresh_token_expires_at timestamp,
        scope text,
        password text,
        created_at timestamp NOT NULL,
        updated_at timestamp NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.verification (
        id text PRIMARY KEY,
        identifier text NOT NULL,
        value text NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp,
        updated_at timestamp
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.workspaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        logo_url text,
        created_by text NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.workspace_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        role public.workspace_member_role DEFAULT 'MEMBER' NOT NULL,
        granted_by text NOT NULL,
        granted_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workspace_member_unique_idx
      ON public.workspace_members(workspace_id, user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workspace_member_user_idx
      ON public.workspace_members(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS workspace_member_workspace_idx
      ON public.workspace_members(workspace_id)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workspace_slug_idx
      ON public.workspaces(slug)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.access_groups (
        id serial PRIMARY KEY,
        name varchar(120) NOT NULL,
        description text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id serial PRIMARY KEY,
        key varchar(255) NOT NULL UNIQUE,
        module_slug varchar(120) NOT NULL,
        action varchar(20) NOT NULL,
        description text,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS permission_key_idx
      ON public.permissions(key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS permission_module_slug_idx
      ON public.permissions(module_slug)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.group_permissions (
        id serial PRIMARY KEY,
        group_id integer NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
        permission_id integer NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS group_permission_unique_idx
      ON public.group_permissions(group_id, permission_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_groups (
        id serial PRIMARY KEY,
        user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        group_id integer NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_group_unique_idx
      ON public.user_groups(user_id, group_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_permissions (
        id serial PRIMARY KEY,
        user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        permission_id integer NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_permission_unique_idx
      ON public.user_permissions(user_id, permission_id)
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedDefaultWorkspaceData() {
  const workspacePool = new Pool({
    connectionString: rawUrl,
    ssl,
  });

  const db = drizzle(workspacePool);
  const workspaceId = await resolveWorkspaceId('dstech');

  const targets = [
    { activityType: 'instalacao_nova', targetHours: 24 },
    { activityType: 'instalacao_reativacao', targetHours: 24 },
    { activityType: 'reparo', targetHours: 24 },
    { activityType: 'reparo_corporativo', targetHours: 4 },
    { activityType: 'mudanca_endereco', targetHours: 48 },
    { activityType: 'mudanca_plano', targetHours: 24 },
    { activityType: 'retirada_kit', targetHours: 72 },
  ] as const;

  for (const target of targets) {
    await db
      .insert(slaTargets)
      .values({ ...target, workspaceId })
      .onConflictDoUpdate({
        target: slaTargets.activityType,
        set: { targetHours: target.targetHours, workspaceId },
      });
  }

  const nationalHolidays = [
    ['2024-01-01', 'Confraternização Universal'],
    ['2024-02-13', 'Carnaval'],
    ['2024-03-29', 'Paixão de Cristo'],
    ['2024-04-21', 'Tiradentes'],
    ['2024-05-01', 'Dia do Trabalho'],
    ['2024-09-07', 'Independência do Brasil'],
    ['2024-10-12', 'Nossa Sr.a Aparecida'],
    ['2024-11-02', 'Finados'],
    ['2024-11-15', 'Proclamação da República'],
    ['2024-11-20', 'Consciência Negra'],
    ['2024-12-25', 'Natal'],
    ['2025-01-01', 'Confraternização Universal'],
    ['2025-03-04', 'Carnaval'],
    ['2025-04-18', 'Paixão de Cristo'],
    ['2025-04-21', 'Tiradentes'],
    ['2025-05-01', 'Dia do Trabalho'],
    ['2025-09-07', 'Independência do Brasil'],
    ['2025-10-12', 'Nossa Sr.a Aparecida'],
    ['2025-11-02', 'Finados'],
    ['2025-11-15', 'Proclamação da República'],
    ['2025-11-20', 'Consciência Negra'],
    ['2025-12-25', 'Natal'],
    ['2026-01-01', 'Confraternização Universal'],
    ['2026-02-17', 'Carnaval'],
    ['2026-04-03', 'Paixão de Cristo'],
    ['2026-04-21', 'Tiradentes'],
    ['2026-05-01', 'Dia do Trabalho'],
    ['2026-09-07', 'Independência do Brasil'],
    ['2026-10-12', 'Nossa Sr.a Aparecida'],
    ['2026-11-02', 'Finados'],
    ['2026-11-15', 'Proclamação da República'],
    ['2026-11-20', 'Consciência Negra'],
    ['2026-12-25', 'Natal'],
  ] as const;

  for (const [date, name] of nationalHolidays) {
    await db
      .insert(holidays)
      .values({
        date,
        name,
        year: Number(date.slice(0, 4)),
      })
      .onConflictDoNothing({ target: holidays.date });
  }

  await ensureDefaultModules(workspaceId);

  await workspacePool.end();
}

async function main() {
  console.log('Bootstrapping banco limpo...');
  await ensurePublicGlobals();
  console.log('Tabelas globais em public: OK');

  const globalDb = drizzle(globalPool);
  const [existingWorkspace] = await globalDb
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, 'dstech'))
    .limit(1);

  if (!existingWorkspace) {
    await globalDb.insert(workspaces).values({
      name: 'DSTECH',
      slug: 'dstech',
      createdBy: 'system-bootstrap',
    });
  }
  console.log('Workspace principal dstech: OK');

  await seedDefaultWorkspaceData();
  console.log('Seed inicial do workspace dstech: OK');

  await globalPool.end();
  console.log('Bootstrap concluído.');
}

main().catch(async (error) => {
  console.error('Falha no bootstrap:', error);
  await globalPool.end().catch(() => undefined);
  process.exit(1);
});
