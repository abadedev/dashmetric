import { sql } from 'drizzle-orm';
import { getInfraDb } from '@/lib/db/infra';

export async function ensureMonitoramentoTable(): Promise<void> {
  const db = getInfraDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS monitoramento_items (
      id                serial PRIMARY KEY,
      workspace_id      varchar(100),
      data_postagem     date NOT NULL,
      area_city         varchar(100),
      cliente           text,
      login             varchar(50),
      rede              varchar(100),
      serial_mac        varchar(100),
      problema          varchar(50),
      qtd_desconexao    integer,
      observacoes       text,
      solucao           text,
      data_solucao      date,
      atend_aberto      boolean DEFAULT false,
      sensor            varchar(50),
      status            varchar(30) NOT NULL DEFAULT '0_aguardando_rede',
      criado_por        varchar(255),
      resolvido_por     varchar(255),
      resolvido_at      timestamp,
      created_at        timestamp DEFAULT now() NOT NULL,
      updated_at        timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mon_workspace_idx ON monitoramento_items (workspace_id);
    CREATE INDEX IF NOT EXISTS mon_status_idx ON monitoramento_items (status);
    CREATE INDEX IF NOT EXISTS mon_data_postagem_idx ON monitoramento_items (data_postagem);
  `);
}
