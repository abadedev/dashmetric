import 'dotenv/config';
import { Pool } from 'pg';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

// ──────────────────────────────────────────────────────────────────────────────
// Banco principal — limpa omnichannel_records e omnichannel_sales_records
// ──────────────────────────────────────────────────────────────────────────────

const mainUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!mainUrl) {
  throw new Error('DATABASE_URL não configurada.');
}

const pool = new Pool({
  connectionString: mainUrl,
  ssl: mainUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function tableExists(tableName: string, schema = 'public'): Promise<boolean> {
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
  console.log('Iniciando limpeza dos dados do Omnichannel...\n');

  await pool.query('BEGIN');
  try {
    // omnichannel_records
    if (await tableExists('omnichannel_records')) {
      await pool.query(`TRUNCATE TABLE "public"."omnichannel_records" RESTART IDENTITY CASCADE`);
      console.log('✔ tabela "omnichannel_records" limpa.');
    } else {
      console.log('- tabela "omnichannel_records" não encontrada, nada a fazer.');
    }

    // omnichannel_sales_records
    if (await tableExists('omnichannel_sales_records')) {
      await pool.query(`TRUNCATE TABLE "public"."omnichannel_sales_records" RESTART IDENTITY CASCADE`);
      console.log('✔ tabela "omnichannel_sales_records" limpa.');
    } else {
      console.log('- tabela "omnichannel_sales_records" não encontrada, nada a fazer.');
    }

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  } finally {
    await pool.end();
  }

  console.log('\nLimpeza concluída com sucesso.');
  console.log('Preservado: toda a configuração do sistema (workspaces, usuários, perfis de importação, etc.).');
  console.log('Removido: todos os registros de Omnichannel (omnichannel_records e omnichannel_sales_records).');
}

main().catch((err) => {
  console.error('Falha ao limpar banco do Omnichannel:', err);
  process.exit(1);
});
