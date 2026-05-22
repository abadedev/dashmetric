import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const client = new pg.Client({ connectionString: url });
await client.connect();

const before = await client.query(`
  SELECT
    (SELECT count(*) FROM support_records) AS support_records,
    (SELECT count(*) FROM support_call_records) AS support_call_records,
    (SELECT count(*) FROM support_call_categories) AS support_call_categories
`);
console.log('BEFORE:', before.rows[0]);

await client.query('TRUNCATE TABLE support_records, support_call_records, support_call_categories RESTART IDENTITY');

const after = await client.query(`
  SELECT
    (SELECT count(*) FROM support_records) AS support_records,
    (SELECT count(*) FROM support_call_records) AS support_call_records,
    (SELECT count(*) FROM support_call_categories) AS support_call_categories
`);
console.log('AFTER:', after.rows[0]);

await client.end();
