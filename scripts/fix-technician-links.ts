/**
 * fix-technician-links.ts
 *
 * Corrige registros de service_orders que ficaram com technician_id = NULL
 * por causa de um bug na importação (resolveTechnicians era chamado antes da
 * normalização das colunas do CSV do sistema).
 *
 * Como funciona:
 *  1. Lê o CSV original (mesmo arquivo que foi importado)
 *  2. Extrai pares Login → Instalador (login do técnico → nome)
 *  3. Cria/atualiza os técnicos no banco com o login correto
 *  4. Faz UPDATE em service_orders WHERE technician_id IS NULL
 *     cruzando service_orders.os_number = technicians.login
 *
 * Uso:
 *   npx tsx scripts/fix-technician-links.ts <caminho-do-arquivo.csv>
 *
 * Exemplo:
 *   npx tsx scripts/fix-technician-links.ts "../teste site instalçaio .csv"
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, isNull, sql } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── Utilitários ──────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

// ── Script principal ─────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('❌  Informe o caminho do CSV como argumento.');
    console.error('    Exemplo: npx tsx scripts/fix-technician-links.ts "../arquivo.csv"');
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌  Arquivo não encontrado: ${fullPath}`);
    process.exit(1);
  }

  console.log(`\n📂  Lendo: ${fullPath}`);
  const csvText = fs.readFileSync(fullPath, 'utf-8');

  const delimiter = csvText.substring(0, 500).includes(';') ? ';' : ',';
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter,
    transformHeader: normalizeHeader,
  });

  // ── 1. Extrai pares login → nome do técnico ─────────────────────────────
  const loginToName = new Map<string, string>();

  for (const row of parsed.data) {
    const login = (row.login || '').trim();
    const name  = (row.instalador || row.tecnico || '').trim();
    if (login && name) {
      loginToName.set(login, normalizeName(name));
    }
  }

  if (loginToName.size === 0) {
    console.error('❌  Nenhum par Login/Instalador encontrado no CSV.');
    console.error('    Verifique se as colunas "Login" e "Instalador" existem.');
    process.exit(1);
  }

  console.log(`\n👷  Técnicos encontrados no CSV: ${loginToName.size}`);
  for (const [login, name] of loginToName) {
    console.log(`    ${login.padEnd(12)} → ${name}`);
  }

  // ── 2. Cria ou atualiza técnicos no banco ───────────────────────────────
  console.log('\n🔧  Sincronizando técnicos no banco...');
  let criados = 0;
  let atualizados = 0;

  for (const [login, name] of loginToName) {
    // Busca por login exato
    const byLogin = await db.query.technicians.findFirst({
      where: eq(schema.technicians.login, login),
    });

    if (byLogin) {
      // Já existe pelo login — garante que o nome está correto
      if (byLogin.name !== name) {
        await db
          .update(schema.technicians)
          .set({ name, updatedAt: new Date() })
          .where(eq(schema.technicians.id, byLogin.id));
        console.log(`    ✏️   Atualizado: ${byLogin.name} → ${name} (login: ${login})`);
        atualizados++;
      }
      continue;
    }

    // Busca por nome (pode ter sido criado sem login)
    const byName = await db.query.technicians.findFirst({
      where: eq(schema.technicians.name, name),
    });

    if (byName) {
      // Existe pelo nome — adiciona o login
      await db
        .update(schema.technicians)
        .set({ login, updatedAt: new Date() })
        .where(eq(schema.technicians.id, byName.id));
      console.log(`    🔗  Login adicionado: ${name} → login ${login}`);
      atualizados++;
    } else {
      // Não existe — cria
      await db.insert(schema.technicians).values({ name, login });
      console.log(`    ➕  Criado: ${name} (login: ${login})`);
      criados++;
    }
  }

  console.log(`\n    Criados: ${criados} | Atualizados: ${atualizados}`);

  // ── 3. Conta orphans antes do UPDATE ────────────────────────────────────
  const [{ count: orphansBefore }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count FROM service_orders WHERE technician_id IS NULL`
  );
  console.log(`\n📊  Registros órfãos (technician_id IS NULL): ${orphansBefore}`);

  if (Number(orphansBefore) === 0) {
    console.log('✅  Nenhum registro órfão — nada a corrigir.');
    await pool.end();
    return;
  }

  // ── 4. UPDATE cruzando os_number = technicians.login ────────────────────
  console.log('\n🔄  Executando UPDATE...');

  const updateResult = await db.execute(sql`
    UPDATE service_orders so
    SET    technician_id = t.id
    FROM   technicians t
    WHERE  so.technician_id IS NULL
      AND  so.os_number     = t.login
  `);

  const updated = (updateResult as any).rowCount ?? '?';
  console.log(`    Linhas atualizadas: ${updated}`);

  // ── 5. Relatório final ──────────────────────────────────────────────────
  const [{ count: orphansAfter }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count FROM service_orders WHERE technician_id IS NULL`
  );

  console.log(`\n📋  Resumo:`);
  console.log(`    Antes : ${orphansBefore} órfãos`);
  console.log(`    Depois: ${orphansAfter}  órfãos`);

  if (Number(orphansAfter) > 0) {
    console.warn(
      `\n⚠️   Ainda restam ${orphansAfter} registros sem técnico.`
    );
    console.warn(
      `    Isso pode indicar linhas onde os_number não bate com nenhum login.`
    );
    console.warn(`    Verifique com:\n`);
    console.warn(
      `    SELECT os_number, client_name, opened_at FROM service_orders WHERE technician_id IS NULL LIMIT 20;`
    );
  } else {
    console.log('\n✅  Todos os registros foram associados com sucesso!');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('\n💥  Erro fatal:', err);
  process.exit(1);
});
