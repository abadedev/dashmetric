import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const client = new pg.Client({ connectionString: url });
await client.connect();

const r = await client.query(`
  SELECT segmento, COUNT(*)::int AS qtd
  FROM support_call_records
  WHERE period_month = 5 AND period_year = 2026
  GROUP BY segmento
  ORDER BY qtd DESC
`);
console.table(r.rows);

const total = await client.query(`
  SELECT COUNT(*)::int AS total FROM support_call_records
  WHERE period_month = 5 AND period_year = 2026
`);
console.log('Total no período 5/2026:', total.rows[0].total);

await client.end();
