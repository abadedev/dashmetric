import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { holidays, slaTargets } from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Inserir Metas SLA
  console.log('1️⃣ Inserindo Metas de SLA...');
  const targets = [
    { type: 'instalacao_nova', targetHours: 24, description: 'Instalação Nova (Geral)' },
    { type: 'instalacao_reativacao', targetHours: 24, description: 'Instalação Reativação' },
    { type: 'reparo', targetHours: 24, description: 'Reparo Padrão' },
    { type: 'mudanca_endereco', targetHours: 24, description: 'Mudança de Endereço' },
    { type: 'mudanca_plano', targetHours: 24, description: 'Mudança de Plano' },
  ];

  for (const t of targets) {
    try {
      await db.insert(slaTargets).values({
        activityType: t.type as any,
        targetHours: t.targetHours,
      });
      console.log(`  ✅ Meta para ${t.type} inserida.`);
    } catch (e: any) {
      if (e.code === '23505') { // unique violation
        console.log(`  ℹ️ Meta para ${t.type} já existe.`);
      } else {
        console.error(`  ❌ Erro ao inserir meta para ${t.type}:`, e);
      }
    }
  }

  // 2. Inserir Feriados Nacionais 2024 a 2026
  console.log('2️⃣ Inserindo Feriados Nacionais (2024-2026)...');
  const nationalHolidays = [
    // 2024
    { date: '2024-01-01', description: 'Confraternização Universal' },
    { date: '2024-02-13', description: 'Carnaval' },
    { date: '2024-03-29', description: 'Paixão de Cristo' },
    { date: '2024-04-21', description: 'Tiradentes' },
    { date: '2024-05-01', description: 'Dia do Trabalho' },
    { date: '2024-09-07', description: 'Independência do Brasil' },
    { date: '2024-10-12', description: 'Nossa Sr.a Aparecida' },
    { date: '2024-11-02', description: 'Finados' },
    { date: '2024-11-15', description: 'Proclamação da República' },
    { date: '2024-11-20', description: 'Consciência Negra' },
    { date: '2024-12-25', description: 'Natal' },
    // 2025
    { date: '2025-01-01', description: 'Confraternização Universal' },
    { date: '2025-03-04', description: 'Carnaval' },
    { date: '2025-04-18', description: 'Paixão de Cristo' },
    { date: '2025-04-21', description: 'Tiradentes' },
    { date: '2025-05-01', description: 'Dia do Trabalho' },
    { date: '2025-09-07', description: 'Independência do Brasil' },
    { date: '2025-10-12', description: 'Nossa Sr.a Aparecida' },
    { date: '2025-11-02', description: 'Finados' },
    { date: '2025-11-15', description: 'Proclamação da República' },
    { date: '2025-11-20', description: 'Consciência Negra' },
    { date: '2025-12-25', description: 'Natal' },
    // 2026
    { date: '2026-01-01', description: 'Confraternização Universal' },
    { date: '2026-02-17', description: 'Carnaval' },
    { date: '2026-04-03', description: 'Paixão de Cristo' },
    { date: '2026-04-21', description: 'Tiradentes' },
    { date: '2026-05-01', description: 'Dia do Trabalho' },
    { date: '2026-09-07', description: 'Independência do Brasil' },
    { date: '2026-10-12', description: 'Nossa Sr.a Aparecida' },
    { date: '2026-11-02', description: 'Finados' },
    { date: '2026-11-15', description: 'Proclamação da República' },
    { date: '2026-11-20', description: 'Consciência Negra' },
    { date: '2026-12-25', description: 'Natal' },
  ];

  for (const h of nationalHolidays) {
    try {
      await db.insert(holidays).values({
        date: h.date,
        name: h.description,
        year: parseInt(h.date.split('-')[0], 10),
      });
      console.log(`  ✅ Feriado ${h.description} (${h.date}) inserido.`);
    } catch (e: any) {
      if (e.code === '23505') {
        // ignora se já existir
      } else {
        console.error(`  ❌ Erro ao inserir feriado ${h.date}:`, e);
      }
    }
  }

  console.log('✅ Seed concluído!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro fatal no seed:', err);
  process.exit(1);
});
