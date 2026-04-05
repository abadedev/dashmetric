import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const sql = readFileSync(
  join(process.cwd(), 'drizzle/migrations/0007_add_workspace_id.sql'),
  'utf-8'
);

const client = new pg.Client({ connectionString: url });

async function run() {
  await client.connect();
  console.log('Connected. Running migration...');

  // Split by semicolons, strip comment-only lines but keep mixed comment+DDL statements
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => {
      // Remove leading comment lines, keep the actual SQL
      return s
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim();
    })
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      console.log(`  ✓ ${preview}`);
    } catch (err: any) {
      if (err.code === '42701') {
        // column already exists — safe to skip
        console.log(`  ~ already exists, skipped: ${preview}`);
      } else if (err.code === '42P07') {
        // index/relation already exists
        console.log(`  ~ already exists, skipped: ${preview}`);
      } else {
        console.error(`  ✗ FAILED: ${preview}`);
        console.error(`    ${err.message}`);
      }
    }
  }

  await client.end();
  console.log('\nMigration complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
