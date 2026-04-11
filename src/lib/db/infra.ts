import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as infraSchema from './infra-schema';

type InfraDb = ReturnType<typeof drizzle<typeof infraSchema>>;

let infraDb: InfraDb | null = null;

function buildInfraSSL() {
  // Produção: lê das variáveis de ambiente
  if (process.env.INFRA_DB_CERT) {
    return {
      ca: process.env.INFRA_DB_CERT,
      cert: process.env.INFRA_DB_CERT_CLIENT ?? undefined,
      key: process.env.INFRA_DB_KEY ?? undefined,
      rejectUnauthorized: true,
    };
  }

  // Desenvolvimento: lê arquivos físicos locais
  const caPath = path.resolve(process.cwd(), 'certs/ca-certificate.crt');
  const certPath = path.resolve(process.cwd(), 'certs/certificate.pem');
  const keyPath = path.resolve(process.cwd(), 'certs/private-key.key');

  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath, 'utf-8'),
      cert: fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf-8') : undefined,
      key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf-8') : undefined,
      rejectUnauthorized: true,
    };
  }

  console.warn('[infra-db] Nenhum certificado SSL encontrado');
  return false;
}

function createInfraDb() {
  const pool = new Pool({
    connectionString: process.env.INFRA_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: buildInfraSSL(),
  });

  return drizzle(pool, { schema: infraSchema });
}

export function getInfraDb() {
  if (!infraDb) {
    infraDb = createInfraDb();
  }

  return infraDb;
}
