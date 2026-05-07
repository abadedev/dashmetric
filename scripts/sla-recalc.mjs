import 'dotenv/config';
import { Pool } from 'pg';

const COMMIT = process.argv.includes('--commit');

const TYPES_AFETADOS = [
  'Instalação (Nova)',
  'Instalação (Reativação)',
  'Mudança de Endereço',
  'Mud. de Endereco',
  'Mudança de Plano',
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function fmtTable(rows) {
  if (!rows.length) return '(sem linhas)';
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const head = '| ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  const body = rows.map(
    (r) => '| ' + cols.map((c, i) => String(r[c] ?? '').padEnd(widths[i])).join(' | ') + ' |'
  );
  return [sep, head, sep, ...body, sep].join('\n');
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Estado ANTES
    const antes = await client.query(
      `SELECT tipo, sla_horas, COUNT(*)::int AS total
         FROM atendimentos
        WHERE tipo = ANY($1)
        GROUP BY tipo, sla_horas
        ORDER BY tipo, sla_horas`,
      [TYPES_AFETADOS]
    );
    console.log('\n=== ANTES — distribuição (tipo, sla_horas) ===');
    console.log(fmtTable(antes.rows));

    const u1 = await client.query(
      `UPDATE atendimentos
          SET sla_horas = 24
        WHERE tipo = ANY($1)
          AND sla_horas IS NOT NULL
          AND sla_horas <> 24`,
      [TYPES_AFETADOS]
    );
    console.log(`\nUPDATE 1 (sla_horas → 24): ${u1.rowCount} linhas`);

    const u2 = await client.query(
      `UPDATE atendimentos
          SET dentro_sla = CASE
            WHEN sla_corrido_segundos IS NULL THEN NULL
            WHEN sla_corrido_segundos <= 86400 THEN true
            ELSE false
          END
        WHERE tipo = ANY($1)`,
      [TYPES_AFETADOS]
    );
    console.log(`UPDATE 2 (dentro_sla recalc): ${u2.rowCount} linhas`);

    const u3 = await client.query(
      `UPDATE atendimentos
          SET dentro_sla_util = CASE
            WHEN sla_util_segundos IS NULL THEN NULL
            WHEN sla_util_segundos <= 86400 THEN true
            ELSE false
          END
        WHERE tipo = ANY($1)`,
      [TYPES_AFETADOS]
    );
    console.log(`UPDATE 3 (dentro_sla_util recalc): ${u3.rowCount} linhas`);

    const v1 = await client.query(
      `SELECT tipo, sla_horas, COUNT(*)::int AS total
         FROM atendimentos
        WHERE tipo IN ('Instalação (Nova)','Instalação (Reativação)','Mudança de Endereço','Mud. de Endereco','Reparo','Mudança de Plano')
        GROUP BY tipo, sla_horas
        ORDER BY tipo, sla_horas`
    );
    console.log('\n=== DEPOIS — distribuição (tipo, sla_horas) ===');
    console.log(fmtTable(v1.rows));

    const v2 = await client.query(
      `SELECT
         tipo,
         COUNT(*) FILTER (WHERE dentro_sla = true)::int      AS dentro_corrido,
         COUNT(*) FILTER (WHERE dentro_sla = false)::int     AS fora_corrido,
         COUNT(*) FILTER (WHERE dentro_sla IS NULL)::int     AS sem_corrido,
         COUNT(*) FILTER (WHERE dentro_sla_util = true)::int  AS dentro_util,
         COUNT(*) FILTER (WHERE dentro_sla_util = false)::int AS fora_util,
         COUNT(*) FILTER (WHERE dentro_sla_util IS NULL)::int AS sem_util
       FROM atendimentos
       WHERE tipo IN ('Instalação (Nova)','Instalação (Reativação)','Mudança de Endereço','Mudança de Plano')
       GROUP BY tipo
       ORDER BY tipo`
    );
    console.log('\n=== DEPOIS — contagens dentro/fora ===');
    console.log(fmtTable(v2.rows));

    // Sanidade: nenhuma divergência entre dentro_sla e a regra <=86400
    const div = await client.query(
      `SELECT COUNT(*)::int AS div_corrido
         FROM atendimentos
        WHERE tipo = ANY($1)
          AND (
            (sla_corrido_segundos IS NULL AND dentro_sla IS NOT NULL) OR
            (sla_corrido_segundos IS NOT NULL AND sla_corrido_segundos <= 86400 AND dentro_sla <> true) OR
            (sla_corrido_segundos IS NOT NULL AND sla_corrido_segundos > 86400  AND dentro_sla <> false)
          )`,
      [TYPES_AFETADOS]
    );
    const divUtil = await client.query(
      `SELECT COUNT(*)::int AS div_util
         FROM atendimentos
        WHERE tipo = ANY($1)
          AND (
            (sla_util_segundos IS NULL AND dentro_sla_util IS NOT NULL) OR
            (sla_util_segundos IS NOT NULL AND sla_util_segundos <= 86400 AND dentro_sla_util <> true) OR
            (sla_util_segundos IS NOT NULL AND sla_util_segundos >  86400 AND dentro_sla_util <> false)
          )`,
      [TYPES_AFETADOS]
    );
    console.log(`\nSanidade — divergências corrido: ${div.rows[0].div_corrido} | divergências util: ${divUtil.rows[0].div_util}`);

    if (COMMIT) {
      await client.query('COMMIT');
      console.log('\n✅ COMMIT realizado.');
    } else {
      await client.query('ROLLBACK');
      console.log('\n↩  ROLLBACK (dry-run). Re-execute com --commit para persistir.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
