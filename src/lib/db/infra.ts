import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as infraSchema from './infra-schema';

type InfraDb = ReturnType<typeof drizzle<typeof infraSchema>>;

let infraDb: InfraDb | null = null;

function buildInfraSslConfig() {
  // Produção (Vercel): certificado CA via variável de ambiente
  if (process.env.INFRA_DB_CERT) {
    return { ca: process.env.INFRA_DB_CERT };
  }

  // Desenvolvimento: lê certificados físicos locais
  const candidates = [
    path.join(process.cwd(), 'certs'),
    path.join(process.cwd(), 'dstech-noc', 'certs'),
  ];

  for (const certsDir of candidates) {
    const caPath = path.join(certsDir, 'ca-certificate.crt');
    const certPath = path.join(certsDir, 'certificate.pem');
    const keyPath = path.join(certsDir, 'private-key.key');

    if (fs.existsSync(caPath) && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath).toString(),
        cert: fs.readFileSync(certPath).toString(),
        key: fs.readFileSync(keyPath).toString(),
      };
    }
  }

  // Sem certificado configurado — conexão sem SSL (não recomendado em produção)
  return false;
}

function createInfraDb() {
  const pool = new Pool({
    connectionString: process.env.INFRA_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: buildInfraSslConfig(),
  });

  return drizzle(pool, { schema: infraSchema });
}

export function getInfraDb() {
  if (!infraDb) {
    infraDb = createInfraDb();
  }

  return infraDb;
}
