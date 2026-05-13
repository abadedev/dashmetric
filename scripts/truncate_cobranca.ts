import 'dotenv/config';
import { Pool } from 'pg';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

const rawUrl = normalizeConnectionString(process.env.DATABASE_URL);

if (!rawUrl) {
  console.error('ERRO: DATABASE_URL não configurada no arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: rawUrl,
  ssl: rawUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

async function main() {
  console.log('--- Iniciando limpeza das tabelas de cobrança ---');

  try {
    // 1. Executar o TRUNCATE
    console.log('Executando: TRUNCATE TABLE cobranca_registros, cobranca_imports RESTART IDENTITY;');
    await pool.query('TRUNCATE TABLE cobranca_registros, cobranca_imports RESTART IDENTITY CASCADE;');
    console.log('Comando TRUNCATE executado com sucesso.');

    // 2. Confirmar que as tabelas estão vazias
    const resRegistros = await pool.query('SELECT count(*) FROM cobranca_registros;');
    const resImports = await pool.query('SELECT count(*) FROM cobranca_imports;');

    const countRegistros = parseInt(resRegistros.rows[0].count, 10);
    const countImports = parseInt(resImports.rows[0].count, 10);

    console.log(`\nVerificação pós-limpeza:`);
    console.log(`- cobranca_registros: ${countRegistros} registros`);
    console.log(`- cobranca_imports: ${countImports} registros`);

    if (countRegistros === 0 && countImports === 0) {
      console.log('\nSUCESSO: Ambas as tabelas foram zeradas corretamente.');
    } else {
      console.warn('\nAVISO: Uma ou mais tabelas ainda contêm dados.');
    }

  } catch (error) {
    console.error('Erro ao executar limpeza:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha fatal:', error);
  process.exit(1);
});
