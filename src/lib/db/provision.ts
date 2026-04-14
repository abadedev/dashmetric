import { pool } from './connection';

/**
 * Provisions a new PostgreSQL schema for a workspace.
 *
 * Creates the schema and all workspace-scoped tables inside it.
 * Enum types live in public and are referenced via the search_path.
 *
 * Safe to call multiple times — all statements use IF NOT EXISTS.
 */
export async function provisionWorkspaceSchema(workspaceSlug: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${workspaceSlug}"`);
    await client.query(`SET search_path = "${workspaceSlug}", public`);

    // ── technicians ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id           serial PRIMARY KEY,
        name         varchar(255) NOT NULL,
        login        varchar(100),
        active       boolean DEFAULT true NOT NULL,
        created_at   timestamp DEFAULT now() NOT NULL,
        updated_at   timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tech_name_idx ON technicians(name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS tech_login_idx ON technicians(login)
    `);

    // ── quality_records ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quality_records (
        id               serial PRIMARY KEY,
        os_number        varchar(20),
        indicator        public.quality_indicator NOT NULL,
        reason           text,
        solution         text,
        technician_id    integer REFERENCES technicians(id),
        technician_name  varchar(255),
        client_name      varchar(255),
        city             varchar(100),
        plan             varchar(255),
        opened_at        timestamp,
        closed_at        timestamp,
        duration_seconds integer,
        period_month     integer NOT NULL,
        period_year      integer NOT NULL,
        created_at       timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS qr_indicator_idx ON quality_records(indicator)`);
    await client.query(`CREATE INDEX IF NOT EXISTS qr_technician_idx ON quality_records(technician_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS qr_period_idx ON quality_records(period_year, period_month)`);

    // ── support_records ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_records (
        id               serial PRIMARY KEY,
        attendant_name   varchar(255) NOT NULL,
        support_category varchar(200),
        opened_manut_ext integer DEFAULT 0,
        percentage       numeric(5,2),
        without_manut    integer DEFAULT 0,
        total            integer DEFAULT 0,
        opened_at        timestamp,
        closed_at        timestamp,
        period_month     integer NOT NULL,
        period_year      integer NOT NULL,
        created_at       timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS sr_category_idx ON support_records(support_category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sr_period_idx ON support_records(period_year, period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sr_opened_at_idx ON support_records(opened_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sr_closed_at_idx ON support_records(closed_at)`);

    // ── support_call_categories ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_call_categories (
        id           serial PRIMARY KEY,
        categoria    varchar(200) NOT NULL,
        quantidade   integer NOT NULL,
        percentual   numeric(6,2) NOT NULL,
        period_month integer NOT NULL,
        period_year  integer NOT NULL,
        created_at   timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS scc_period_idx ON support_call_categories(period_year, period_month)`);

    // ── system_modules ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_modules (
        id              serial PRIMARY KEY,
        name            varchar(120) NOT NULL,
        slug            varchar(120) NOT NULL,
        description     text,
        icon            varchar(50) NOT NULL,
        href            varchar(255) NOT NULL,
        sort_order      integer DEFAULT 0 NOT NULL,
        is_active       boolean DEFAULT true NOT NULL,
        show_in_sidebar boolean DEFAULT true NOT NULL,
        allow_import    boolean DEFAULT false NOT NULL,
        required_role   public.role DEFAULT 'user' NOT NULL,
        template_source varchar(120),
        is_editable     boolean DEFAULT true NOT NULL,
        created_at      timestamp DEFAULT now() NOT NULL,
        updated_at      timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS system_module_slug_idx ON system_modules(slug)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS system_module_href_idx ON system_modules(href)`);
    await client.query(`CREATE INDEX IF NOT EXISTS system_module_sort_idx ON system_modules(sort_order)`);

    // ── module_import_profiles ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS module_import_profiles (
        id            serial PRIMARY KEY,
        module_id     integer NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
        profile_key   varchar(120) NOT NULL,
        label         varchar(255) NOT NULL,
        detector_type varchar(120) NOT NULL,
        parameters    jsonb DEFAULT '[]',
        is_active     boolean DEFAULT true NOT NULL,
        created_at    timestamp DEFAULT now() NOT NULL,
        updated_at    timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS module_import_profile_key_idx ON module_import_profiles(module_id, profile_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS module_import_profile_module_idx ON module_import_profiles(module_id)`);

    // ── sales_records ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_records (
        id            serial PRIMARY KEY,
        record_type   public.sales_record_type NOT NULL,
        origin_sector varchar(50) DEFAULT 'vendas' NOT NULL,
        csv_category  varchar(50) DEFAULT 'padrao' NOT NULL,
        client_name   varchar(255),
        city          varchar(120),
        source        varchar(120),
        indication    varchar(255),
        plan          varchar(255),
        observation   text,
        requested_at  timestamp,
        installed_at  timestamp,
        period_month  integer NOT NULL,
        period_year   integer NOT NULL,
        created_at    timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS sales_record_period_idx ON sales_records(period_year, period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sales_record_type_idx ON sales_records(record_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sales_record_origin_sector_idx ON sales_records(origin_sector)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sales_record_csv_category_idx ON sales_records(csv_category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sales_record_city_idx ON sales_records(city)`);

    // ── cancellation_records ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cancellation_records (
        id            serial PRIMARY KEY,
        origin_sector varchar(50) DEFAULT 'retencao' NOT NULL,
        client_name   varchar(255),
        city          varchar(120),
        reason        text,
        source        varchar(120),
        plan          varchar(255),
        observation   text,
        cancelled_at  timestamp,
        period_month  integer NOT NULL,
        period_year   integer NOT NULL,
        created_at    timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS cancellation_record_origin_sector_idx ON cancellation_records(origin_sector)`);
    await client.query(`CREATE INDEX IF NOT EXISTS cancellation_record_period_idx ON cancellation_records(period_year, period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS cancellation_record_city_idx ON cancellation_records(city)`);

    // ── infrastructure_records ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS infrastructure_records (
        id             serial PRIMARY KEY,
        title          varchar(255),
        category       varchar(120),
        city           varchar(120),
        reference_date timestamp,
        payload        jsonb,
        period_month   integer,
        period_year    integer,
        created_at     timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS infrastructure_record_period_idx ON infrastructure_records(period_year, period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS infrastructure_record_city_idx ON infrastructure_records(city)`);

    // ── holidays ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id         serial PRIMARY KEY,
        date       date NOT NULL,
        name       varchar(255) NOT NULL,
        year       integer NOT NULL
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS holiday_date_idx ON holidays(date)`);

    // ── sla_targets ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sla_targets (
        id            serial PRIMARY KEY,
        activity_type public.activity_type NOT NULL UNIQUE,
        target_hours  integer
      )
    `);

    // ── sla_config ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sla_config (
        key        varchar(100) PRIMARY KEY,
        value      text NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);

    // ── lotes_importacao ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lotes_importacao (
        id                serial PRIMARY KEY,
        arquivo           varchar(255) NOT NULL,
        tipo_arquivo      varchar(10) NOT NULL,
        status            varchar(20) NOT NULL DEFAULT 'pendente',
        total_lidas       integer DEFAULT 0,
        total_validas     integer DEFAULT 0,
        total_invalidas   integer DEFAULT 0,
        total_inseridas   integer DEFAULT 0,
        total_duplicadas  integer DEFAULT 0,
        erros             jsonb,
        created_at        timestamp DEFAULT now() NOT NULL
      )
    `);

    // ── importacoes_brutas ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS importacoes_brutas (
        id                  serial PRIMARY KEY,
        lote_importacao_id  integer REFERENCES lotes_importacao(id),
        raw_json            jsonb NOT NULL,
        created_at          timestamp DEFAULT now() NOT NULL
      )
    `);

    // ── atendimentos ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS atendimentos (
        id                    serial PRIMARY KEY,
        numero_os             varchar(50),
        tipo                  varchar(100) NOT NULL,
        motivo                text,
        solucao               text,
        tecnico               varchar(255),
        tecnico_id            integer REFERENCES technicians(id),
        cliente               varchar(255),
        cidade                varchar(100),
        plano                 varchar(255),
        data_abertura         varchar(10),
        hora_abertura         varchar(8),
        data_finalizacao      varchar(10),
        hora_finalizacao      varchar(8),
        abertura_at           timestamp,
        finalizacao_at        timestamp,
        intervalo             varchar(50),
        sla_horas             numeric(6,2),
        dentro_sla            boolean,
        sla_corrido_segundos  integer,
        sla_util_segundos     integer,
        dentro_sla_util       boolean,
        login                 varchar(100),
        endereco              text,
        bairro                varchar(100),
        referencia            text,
        atendente             varchar(255),
        indicacao             varchar(255),
        mac                   varchar(20),
        ativo                 varchar(5),
        empresa               varchar(255),
        data_liberada         varchar(50),
        observacao            text,
        coordenadas           varchar(100),
        telefones             varchar(255),
        agendamento           varchar(100),
        hash_importacao       varchar(64) NOT NULL,
        lote_importacao_id    integer REFERENCES lotes_importacao(id),
        period_month          integer,
        period_year           integer,
        created_at            timestamp DEFAULT now() NOT NULL,
        updated_at            timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_hash_idx ON atendimentos(hash_importacao)`);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_tecnico_id_idx ON atendimentos(tecnico_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_tipo_idx ON atendimentos(tipo)`);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_period_idx ON atendimentos(period_year, period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_abertura_at_idx ON atendimentos(abertura_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS atend_cidade_idx ON atendimentos(cidade)`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
