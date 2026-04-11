import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as infraSchema from './infra-schema';

const pool = new Pool({
  connectionString: process.env.INFRA_DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(path.join(process.cwd(), 'certs', 'ca-certificate.crt')).toString(),
    cert: fs.readFileSync(path.join(process.cwd(), 'certs', 'certificate.pem')).toString(),
    key: fs.readFileSync(path.join(process.cwd(), 'certs', 'private-key.key')).toString(),
  },
});

export const infraDb = drizzle(pool, { schema: infraSchema });
export function getInfraDb() { return infraDb; }
