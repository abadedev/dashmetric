import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as infraSchema from './infra-schema';

type InfraDb = ReturnType<typeof drizzle<typeof infraSchema>>;

let infraDb: InfraDb | null = null;

function resolveCertsDir() {
  const candidates = [
    path.join(process.cwd(), 'certs'),
    path.join(process.cwd(), 'dstech-noc', 'certs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'certificate.pem'))) {
      return candidate;
    }
  }

  throw new Error(
    `INFRA certs directory not found. Checked: ${candidates.join(', ')}`
  );
}

function createInfraDb() {
  const certsDir = resolveCertsDir();
  const pool = new Pool({
    connectionString: process.env.INFRA_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.join(certsDir, 'ca-certificate.crt')).toString(),
      cert: fs.readFileSync(path.join(certsDir, 'certificate.pem')).toString(),
      key: fs.readFileSync(path.join(certsDir, 'private-key.key')).toString(),
    },
  });

  return drizzle(pool, { schema: infraSchema });
}

export function getInfraDb() {
  if (!infraDb) {
    infraDb = createInfraDb();
  }

  return infraDb;
}
