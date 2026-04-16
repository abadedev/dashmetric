import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

// ──────────────────────────────────────────────────────────────────────────────
// 1) Banco principal — limpa infrastructure_records
// ──────────────────────────────────────────────────────────────────────────────

const mainUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!mainUrl) {
  throw new Error('DATABASE_URL não configurada.');
}

const mainPool = new Pool({
  connectionString: mainUrl,
  ssl: mainUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

// ──────────────────────────────────────────────────────────────────────────────
// 2) Banco de infra — limpa service_listings
// ──────────────────────────────────────────────────────────────────────────────

const infraUrl = process.env.INFRA_DATABASE_URL;

if (!infraUrl) {
  throw new Error('INFRA_DATABASE_URL não configurada.');
}

function buildInfraSSL() {
  if (process.env.INFRA_DB_CERT) {
    return {
      ca: process.env.INFRA_DB_CERT,
      cert: process.env.INFRA_DB_CERT_CLIENT ?? undefined,
      key: process.env.INFRA_DB_KEY ?? undefined,
      rejectUnauthorized: true,
    };
  }

  const caPath = path.resolve(process.cwd(), 'certs/ca-certificate.crt');
  const certPath = path.resolve(process.cwd(), 'certs/certificate.pem');
  const keyPath = path.resolve(process.cwd(), 'certs/private-key.key');

  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath, 'utf-8'),
      cert: fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf-8') : undefined,
      key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf-8') : undefined,
      rejectUnauthorized: true,
    };
  }

  console.warn('[infra-db] Nenhum certificado SSL encontrado — conectando sem SSL.');
  return false;
}

const infraPool = new Pool({
  connectionString: infraUrl,
  ssl: buildInfraSSL(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function tableExists(pool: Pool, tableName: string, schema = 'public'): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema, tableName]
  );
  return result.rows[0]?.exists ?? false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando limpeza dos dados de infraestrutura e lista de serviços...\n');

  // ── Banco principal: infrastructure_records ──
  await mainPool.query('BEGIN');
  try {
    if (await tableExists(mainPool, 'infrastructure_records')) {
      await mainPool.query(`TRUNCATE TABLE "public"."infrastructure_records" RESTART IDENTITY CASCADE`);
      console.log('✔ banco principal: tabela "infrastructure_records" limpa.');
    } else {
      console.log('- banco principal: tabela "infrastructure_records" não encontrada, nada a fazer.');
    }
    await mainPool.query('COMMIT');
  } catch (err) {
    await mainPool.query('ROLLBACK');
    throw err;
  } finally {
    await mainPool.end();
  }

  // ── Banco de infra: service_listings ──
  await infraPool.query('BEGIN');
  try {
    if (await tableExists(infraPool, 'service_listings')) {
      await infraPool.query(`TRUNCATE TABLE "public"."service_listings" RESTART IDENTITY CASCADE`);
      console.log('✔ banco de infra: tabela "service_listings" limpa.');
    } else {
      console.log('- banco de infra: tabela "service_listings" não encontrada, nada a fazer.');
    }
    await infraPool.query('COMMIT');
  } catch (err) {
    await infraPool.query('ROLLBACK');
    throw err;
  } finally {
    await infraPool.end();
  }

  console.log('\nLimpeza concluída com sucesso.');
  console.log('Preservado: toda a configuração do sistema (workspaces, usuários, perfis de importação, etc.).');
  console.log('Removido: todos os registros de infraestrutura e listagem de serviços.');
}

main().catch((err) => {
  console.error('Falha ao limpar banco de infra:', err);
  process.exit(1);
});
