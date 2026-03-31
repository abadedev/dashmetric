/**
 * Corrige tipos antigos que foram importados antes da normalização.
 * Uso: npx tsx scripts/fix-tipos.ts
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Mapa de correção: valor antigo → valor correto
const CORRECOES: Record<string, string> = {
  'Atendimento Externo':       'Reparo',
  'Manutencao':                'Reparo',
  'Manutenção':                'Reparo',
  'Reativacao Login':          'Instalação (Reativação)',
  'Reativação Login':          'Instalação (Reativação)',
  'Reativacao de Login':       'Instalação (Reativação)',
  'Reativação de Login':       'Instalação (Reativação)',
  'Nova':                      'Instalação (Nova)',
  'Reativacao':                'Instalação (Reativação)',
  'Reativação':                'Instalação (Reativação)',
};

async function main() {
  console.log('\n🔍 Verificando tipos incorretos no banco...\n');

  // Mostra contagem atual por tipo
  const contagem = await db.execute(sql`
    SELECT tipo, COUNT(*) as total
    FROM atendimentos
    GROUP BY tipo
    ORDER BY total DESC
  `);

  console.log('Tipos atuais:');
  for (const row of contagem.rows as any[]) {
    const correto = CORRECOES[row.tipo];
    console.log(`  ${correto ? '⚠️ ' : '✅'} "${row.tipo}" → ${row.total} registros${correto ? ` [será → "${correto}"]` : ''}`);
  }

  // Aplica correções
  let totalCorrigidos = 0;
  for (const [tipoAntigo, tipoNovo] of Object.entries(CORRECOES)) {
    const result = await db.execute(sql`
      UPDATE atendimentos
      SET tipo = ${tipoNovo},
          updated_at = NOW()
      WHERE tipo = ${tipoAntigo}
    `);
    const n = (result as any).rowCount ?? 0;
    if (n > 0) {
      console.log(`\n✅ "${tipoAntigo}" → "${tipoNovo}" (${n} registros)`);
      totalCorrigidos += n;
    }
  }

  if (totalCorrigidos === 0) {
    console.log('\nℹ️  Nenhum registro precisava de correção.');
  } else {
    console.log(`\n🎉 Total corrigido: ${totalCorrigidos} registros`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('\n💥 Erro:', err);
  process.exit(1);
});
