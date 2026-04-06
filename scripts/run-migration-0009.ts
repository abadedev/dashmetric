import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const sql = readFileSync(
  join(process.cwd(), 'drizzle/migrations/0009_drop_legacy_tables.sql'),
  'utf-8'
);

const client = new pg.Client({ connectionString: url });

async function run() {
  await client.connect();
  console.log('Connected. Running migration 0009...');

  const statements = sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      console.log(`  ✓ ${preview}`);
    } catch (err: any) {
      if (err.code === '42P01') {
        // table/index does not exist — already dropped, safe to skip
        console.log(`  ~ does not exist, skipped: ${preview}`);
      } else if (err.code === '42704') {
        // type does not exist — safe to skip
        console.log(`  ~ type does not exist, skipped: ${preview}`);
      } else {
        console.error(`  ✗ FAILED: ${preview}`);
        console.error(`    ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log('\nMigration 0009 complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
