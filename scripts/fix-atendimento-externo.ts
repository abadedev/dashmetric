/**
 * Script de correção: converte tipo 'Atendimento Externo' → 'Reparo'
 * na tabela atendimentos, garantindo consistência com os indicadores.
 *
 * Como executar:
 *   npx tsx scripts/fix-atendimento-externo.ts
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL não definida no .env');

  const client = neon(databaseUrl);
  const db = drizzle(client);

  console.log('🔍 Verificando registros com tipo "Atendimento Externo"...');

  // Conta antes
  const [{ count: antes }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) as count FROM atendimentos WHERE LOWER(tipo) = 'atendimento externo'`
  );
  console.log(`   Encontrados: ${antes} registros`);

  if (Number(antes) === 0) {
    console.log('✅ Nenhum registro para corrigir. Base já está normalizada.');
    process.exit(0);
  }

  // Executa o UPDATE
  console.log('🔄 Executando UPDATE...');
  await db.execute(
    sql`UPDATE atendimentos SET tipo = 'Reparo', updated_at = NOW() WHERE LOWER(tipo) = 'atendimento externo'`
  );

  // Confirma depois
  const [{ count: depois }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) as count FROM atendimentos WHERE LOWER(tipo) = 'atendimento externo'`
  );

  console.log(`✅ UPDATE concluído!`);
  console.log(`   Corrigidos: ${Number(antes) - Number(depois)} registros`);
  console.log(`   Restantes com "Atendimento Externo": ${depois}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro ao executar migração:', err);
  process.exit(1);
});
