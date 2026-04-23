import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { normalizeConnectionString } from '../src/lib/db/normalize-connection-string';

// ──────────────────────────────────────────────────────────────────────────────
// Banco de infra — normaliza city_area para lowercase canônico
// ──────────────────────────────────────────────────────────────────────────────

const infraUrl = process.env.INFRA_DATABASE_URL;
if (!infraUrl) throw new Error('INFRA_DATABASE_URL não configurada.');

function buildInfraSSL() {
  if (process.env.INFRA_DB_CERT) {
    return {
      ca: process.env.INFRA_DB_CERT,
      cert: process.env.INFRA_DB_CERT_CLIENT ?? undefined,
      key: process.env.INFRA_DB_KEY ?? undefined,
      rejectUnauthorized: true,
    };
  }
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
  console.warn('[normalize-city] Nenhum certificado SSL encontrado — conectando sem SSL.');
  return false;
}

import { normalizeCityArea } from '../src/lib/listagem-servicos/infra-occurrences';

const pool = new Pool({ connectionString: infraUrl, ssl: buildInfraSSL() });

async function main() {
  console.log('Iniciando normalização avançada de city_area (via TS)...\n');

  // Busca todos os registros elegíveis
  const { rows } = await pool.query<{ id: number; city_area: string }>(`
    SELECT id, city_area
    FROM service_listings
    WHERE city_area IS NOT NULL
      AND city_area != ''
  `);

  let updatedCount = 0;
  const changedExamples = new Set<string>();

  for (const row of rows) {
    const raw = row.city_area;
    const normalized = normalizeCityArea(raw);

    if (normalized && normalized !== raw) {
      await pool.query('UPDATE service_listings SET city_area = $1 WHERE id = $2', [
        normalized,
        row.id,
      ]);
      updatedCount++;
      if (changedExamples.size < 5) {
        changedExamples.add(`  "${raw}" → "${normalized}"`);
      }
    }
  }

  console.log(`✔ ${updatedCount} registros normalizados com sucesso.`);
  
  if (changedExamples.size > 0) {
    console.log('\nExemplos de mudanças aplicadas nas últimas rodadas:');
    for (const ex of changedExamples) console.log(ex);
  }
  console.log('\nResultado esperado:');
  console.log('  "TEIXEIRA DE FREITAS" → "teixeira de freitas"');
  console.log('  "Teixeira de Freitas" → "teixeira de freitas"');
  console.log('  "POSTO DA MATA"       → "posto da mata"');
  console.log('\nOs labels do gráfico são exibidos em MAIÚSCULO pelo frontend.');
}

main()
  .catch((err) => {
    console.error('Falha ao normalizar cidades:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
