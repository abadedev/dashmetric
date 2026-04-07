import 'dotenv/config';
import { Pool } from 'pg';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

const rawUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!rawUrl) {
  throw new Error('DATABASE_URL não configurada.');
}

const pool = new Pool({
  connectionString: rawUrl,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

const IMPORT_DATA_TABLES = [
  'importacoes_brutas',
  'lotes_importacao',
  'atendimentos',
  'service_orders',
  'quality_records',
  'support_call_categories',
  'support_records',
  'sales_records',
  'cancellation_records',
  'infrastructure_records',
  'import_batches',
  'technicians',
] as const;

function getArgValue(flag: string) {
  const direct = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);

  const index = process.argv.findIndex((arg) => arg === flag);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function getExistingTables(schema: string) {
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = $1
        and table_type = 'BASE TABLE'
    `,
    [schema]
  );

  return new Set(result.rows.map((row) => row.table_name));
}

async function truncateImportTables(schema: string) {
  const existingTables = await getExistingTables(schema);
  const tablesToTruncate = IMPORT_DATA_TABLES
    .filter((tableName) => existingTables.has(tableName))
    .map((tableName) => `${quoteIdent(schema)}.${quoteIdent(tableName)}`);

  if (tablesToTruncate.length === 0) {
    console.log(`- ${schema}: nenhuma tabela de importação encontrada`);
    return;
  }

  await pool.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`- ${schema}: ${tablesToTruncate.length} tabelas limpas`);
}



async function main() {
  const mainWorkspaceSlug =
    getArgValue('--main-workspace') ??
    process.env.MAIN_WORKSPACE_SLUG ??
    'dstech';

  console.log(`Iniciando limpeza operacional. Configurações de workspace serão preservadas.`);

  await pool.query('BEGIN');

  try {
    await truncateImportTables('public');

    await pool.query('COMMIT');
    console.log('');
    console.log('Banco limpo com sucesso.');
    console.log('Preservado: workspaces, usuários (auth, members), permissões, grupos/perfis, módulos, profiles de importação.');
    console.log('Removido: dados importados, operacionais e atendimentos.');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao resetar banco operacional:', error);
  process.exit(1);
});
