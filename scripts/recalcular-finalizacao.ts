import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, isNotNull, ne, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as schema from '../src/lib/db/schema';
import { parseBRDateWithTime } from '../src/lib/importacao/helpers';
import { calculateSLA, normalizeHolidayKeys } from '../src/lib/sla/calculate-sla';
import { dentroSLA, slaMetaHoras } from '../src/lib/importacao/calcular-sla-bi';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});
const db = drizzle(pool, { schema });

async function main() {
  const holidayRows = await db.select({ date: schema.holidays.date }).from(schema.holidays);
  const feriados = normalizeHolidayKeys(holidayRows.map((r) => r.date as Date | string));

  const rows = await db
    .select({
      id: schema.atendimentos.id,
      tipo: schema.atendimentos.tipo,
      dataFinalizacao: schema.atendimentos.dataFinalizacao,
      horaFinalizacao: schema.atendimentos.horaFinalizacao,
      aberturaAt: schema.atendimentos.aberturaAt,
      slaHoras: schema.atendimentos.slaHoras,
    })
    .from(schema.atendimentos)
    .where(
      and(
        isNull(schema.atendimentos.finalizacaoAt),
        isNotNull(schema.atendimentos.dataFinalizacao),
        ne(schema.atendimentos.dataFinalizacao, ''),
      ),
    );

  console.log(`Encontrados: ${rows.length}`);

  let atualizados = 0;
  let erros = 0;

  for (const row of rows) {
    const finalizacaoAt = parseBRDateWithTime(row.dataFinalizacao!, row.horaFinalizacao ?? '');
    if (!finalizacaoAt) {
      erros++;
      continue;
    }

    const aberturaAt = row.aberturaAt ? new Date(row.aberturaAt) : null;

    let slaCorridoSeg: number | null = null;
    let slaUtilSeg: number | null = null;
    let dentroSlaCorrido: boolean | null = null;
    let dentroSlaUtil: boolean | null = null;

    if (aberturaAt) {
      const metaHoras = slaMetaHoras(row.tipo);
      const calculado = calculateSLA(aberturaAt, finalizacaoAt, { holidayKeys: feriados });
      slaCorridoSeg = calculado.slaCorridoSegundos;
      slaUtilSeg = calculado.slaUtilSegundos;
      dentroSlaCorrido = dentroSLA(slaCorridoSeg, metaHoras);
      dentroSlaUtil = dentroSLA(slaUtilSeg, metaHoras);
    }

    await db
      .update(schema.atendimentos)
      .set({
        finalizacaoAt,
        slaCorridoSegundos: slaCorridoSeg,
        slaUtilSegundos: slaUtilSeg,
        dentroSla: dentroSlaCorrido,
        dentroSlaUtil: dentroSlaUtil,
      })
      .where(eq(schema.atendimentos.id, row.id));

    atualizados++;
  }

  console.log(`Atualizados: ${atualizados}`);
  console.log(`Erro de parse: ${erros}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
