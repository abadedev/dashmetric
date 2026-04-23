import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const infraUrl = process.env.INFRA_DATABASE_URL;
if (!infraUrl) throw new Error('INFRA_DATABASE_URL não configurada.');

const caPath = path.resolve(process.cwd(), 'certs/ca-certificate.crt');
const ssl = fs.existsSync(caPath)
  ? { ca: fs.readFileSync(caPath, 'utf-8'), rejectUnauthorized: true }
  : false;

const pool = new Pool({ connectionString: infraUrl, ssl });

async function main() {
  // Lista todos os valores distintos de city_area para diagnóstico
  const { rows: distinct } = await pool.query<{ city_area: string; total: string }>(`
    SELECT city_area, count(*) AS total
    FROM service_listings
    WHERE city_area ILIKE '%posto%' OR city_area ILIKE '%po to%'
    GROUP BY city_area
    ORDER BY city_area
  `);

  console.log('Valores distintos relacionados a "Posto/Po To":');
  console.table(distinct);

  // Força correção de qualquer variação de "po to da mata"
  const { rowCount } = await pool.query(`
    UPDATE service_listings
    SET city_area = 'posto da mata'
    WHERE city_area IN ('po to da mata', 'po to da matta', 'posto da matta', 'posto  da mata')
       OR (city_area ILIKE '%po to%')
  `);

  console.log(`\n✔ ${rowCount} registros de "po to da mata" corrigidos para "posto da mata".`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => pool.end());
