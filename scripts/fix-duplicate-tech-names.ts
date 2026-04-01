/**
 * fix-duplicate-tech-names.ts
 *
 * Corrige nomes duplicados de técnicos no banco causados por diferenças
 * de formatação (ex: "Ian.ferreira" vs "Ian Ferreira").
 *
 * O que faz:
 *  1. Normaliza todos os nomes: troca ponto por espaço + Title Case
 *  2. Se o nome normalizado já existe como outro registro, mescla os
 *     atendimentos do duplicado para o técnico canônico e remove o duplicado
 *  3. Se não existe duplicata, só atualiza o nome do técnico no lugar
 *
 * Uso:
 *   npx tsx scripts/fix-duplicate-tech-names.ts
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function normalizeTechName(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function main() {
  console.log('\n🔍  Buscando técnicos no banco...');

  const allTechs = await db
    .select({ id: schema.technicians.id, name: schema.technicians.name, login: schema.technicians.login })
    .from(schema.technicians)
    .orderBy(schema.technicians.id);

  console.log(`    Total de técnicos: ${allTechs.length}`);

  // Mapeia nome normalizado → técnico canônico (menor id = primeiro cadastrado)
  const canonical = new Map<string, typeof allTechs[0]>();
  for (const tech of allTechs) {
    const norm = normalizeTechName(tech.name);
    if (!canonical.has(norm)) {
      canonical.set(norm, tech);
    }
  }

  let renamed = 0;
  let merged  = 0;

  for (const tech of allTechs) {
    const norm = normalizeTechName(tech.name);
    const canon = canonical.get(norm)!;

    if (canon.id === tech.id && tech.name !== norm) {
      // Mesmo técnico canônico, só precisa renomear
      console.log(`\n  ✏️   Renomeando: "${tech.name}" → "${norm}" (id=${tech.id})`);

      await db
        .update(schema.technicians)
        .set({ name: norm, updatedAt: new Date() })
        .where(eq(schema.technicians.id, tech.id));

      // Atualiza campo denormalizado em atendimentos
      const res = await db.execute(
        sql`UPDATE atendimentos SET tecnico = ${norm} WHERE tecnico_id = ${tech.id}`
      );
      const rows = (res as any).rowCount ?? 0;
      console.log(`      → ${rows} atendimento(s) atualizados`);

      renamed++;
      continue;
    }

    if (canon.id !== tech.id) {
      // Duplicata — mesclar para o canônico e deletar este
      console.log(`\n  🔀  Mesclando duplicata: "${tech.name}" (id=${tech.id}) → "${canon.name}" (id=${canon.id})`);

      // Reatribuir atendimentos
      const resAt = await db.execute(sql`
        UPDATE atendimentos
        SET    tecnico_id = ${canon.id},
               tecnico    = ${norm}
        WHERE  tecnico_id = ${tech.id}
      `);
      const rowsAt = (resAt as any).rowCount ?? 0;
      console.log(`      → ${rowsAt} atendimento(s) migrados`);

      // Reatribuir service_orders (tabela antiga), se existir
      try {
        const resSO = await db.execute(sql`
          UPDATE service_orders
          SET    technician_id = ${canon.id}
          WHERE  technician_id = ${tech.id}
        `);
        const rowsSO = (resSO as any).rowCount ?? 0;
        if (rowsSO > 0) console.log(`      → ${rowsSO} service_order(s) migrados`);
      } catch {
        // tabela pode não existir — ignora
      }

      // Reatribuir quality_records, se existir
      try {
        const resQR = await db.execute(sql`
          UPDATE quality_records
          SET    technician_id = ${canon.id}
          WHERE  technician_id = ${tech.id}
        `);
        const rowsQR = (resQR as any).rowCount ?? 0;
        if (rowsQR > 0) console.log(`      → ${rowsQR} quality_record(s) migrados`);
      } catch {
        // tabela pode não existir — ignora
      }

      // Transferir login se o canônico não tiver
      if (!canon.login && tech.login) {
        await db
          .update(schema.technicians)
          .set({ login: tech.login, updatedAt: new Date() })
          .where(eq(schema.technicians.id, canon.id));
        console.log(`      → Login "${tech.login}" transferido para o canônico`);
        canon.login = tech.login;
      }

      // Garante que o canônico está com o nome normalizado
      if (canon.name !== norm) {
        await db
          .update(schema.technicians)
          .set({ name: norm, updatedAt: new Date() })
          .where(eq(schema.technicians.id, canon.id));
        canon.name = norm;
      }

      // Remove o duplicado
      await db
        .delete(schema.technicians)
        .where(eq(schema.technicians.id, tech.id));
      console.log(`      → Duplicata id=${tech.id} removida`);

      merged++;
    }
  }

  console.log(`\n✅  Concluído.`);
  console.log(`    Renomeados : ${renamed}`);
  console.log(`    Mesclados  : ${merged}`);

  await pool.end();
}

main().catch((err) => {
  console.error('\n💥  Erro fatal:', err);
  process.exit(1);
});
