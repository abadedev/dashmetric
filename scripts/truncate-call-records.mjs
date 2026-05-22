import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const client = new pg.Client({ connectionString: url });
await client.connect();

const before = await client.query('SELECT count(*) FROM support_call_records');
console.log('BEFORE:', before.rows[0].count);

await client.query('TRUNCATE TABLE support_call_records RESTART IDENTITY');

const after = await client.query('SELECT count(*) FROM support_call_records');
console.log('AFTER:', after.rows[0].count);

await client.end();
