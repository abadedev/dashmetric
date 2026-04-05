-- Migrates legacy per-schema operational data into public.* with workspace_id.
-- Execution:
-- 1. Run 01_audit_workspace_unification.sql and review the output.
-- 2. Confirm public.workspaces.slug contains dstech / fleckinfo / teste2 for the schemas you will migrate.
-- 3. Run this script.
-- 4. Run 01_audit_workspace_unification.sql again and compare counts.

begin;

set local search_path to public;

create temp table tmp_legacy_workspace_map (
  schema_name text primary key,
  workspace_id uuid not null
) on commit drop;

insert into tmp_legacy_workspace_map(schema_name, workspace_id)
select s.schema_name, w.id
from (select unnest(array['dstech', 'fleckinfo', 'teste2']) as schema_name) s
join public.workspaces w on w.slug = s.schema_name
where exists (
  select 1
  from information_schema.schemata sc
  where sc.schema_name = s.schema_name
);

create temp table tmp_legacy_technician_map (
  schema_name text not null,
  legacy_id integer not null,
  public_id integer not null,
  primary key (schema_name, legacy_id)
) on commit drop;

create temp table tmp_legacy_import_batch_map (
  schema_name text not null,
  legacy_id integer not null,
  public_id integer not null,
  primary key (schema_name, legacy_id)
) on commit drop;

create temp table tmp_legacy_lote_map (
  schema_name text not null,
  legacy_id integer not null,
  public_id integer not null,
  primary key (schema_name, legacy_id)
) on commit drop;

do $$
declare
  missing_schemas text[];
begin
  select array_agg(schema_name order by schema_name)
  into missing_schemas
  from (
    select sc.schema_name
    from information_schema.schemata sc
    where sc.schema_name in ('dstech', 'fleckinfo', 'teste2')
    except
    select schema_name from tmp_legacy_workspace_map
  ) q;

  if missing_schemas is not null then
    raise exception 'Missing public.workspaces mapping for schemas: %', missing_schemas;
  end if;
end $$;

do $$
declare
  ws record;
begin
  for ws in select * from tmp_legacy_workspace_map order by schema_name loop
    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'technicians') then
      execute format($sql$
        insert into public.technicians (workspace_id, name, login, active, created_at, updated_at)
        select %L::uuid, t.name, t.login, coalesce(t.active, true), coalesce(t.created_at, now()), coalesce(t.updated_at, now())
        from %I.technicians t
        where not exists (
          select 1
          from public.technicians p
          where p.workspace_id = %L::uuid
            and (
              lower(p.name) = lower(t.name)
              or (p.login is not null and t.login is not null and p.login = t.login)
            )
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);

      execute format($sql$
        insert into tmp_legacy_technician_map(schema_name, legacy_id, public_id)
        select %L, t.id, p.id
        from %I.technicians t
        join public.technicians p
          on p.workspace_id = %L::uuid
         and (
           lower(p.name) = lower(t.name)
           or (p.login is not null and t.login is not null and p.login = t.login)
         )
        on conflict (schema_name, legacy_id) do update
        set public_id = excluded.public_id
      $sql$, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'import_batches') then
      execute format($sql$
        insert into public.import_batches (workspace_id, filename, total_rows, imported_rows, errors, error_details, status, created_at)
        select %L::uuid, b.filename, b.total_rows, b.imported_rows, b.errors, b.error_details, b.status, coalesce(b.created_at, now())
        from %I.import_batches b
        where not exists (
          select 1
          from public.import_batches p
          where p.workspace_id = %L::uuid
            and p.filename = b.filename
            and coalesce(p.created_at, now()) = coalesce(b.created_at, now())
            and coalesce(p.status::text, '') = coalesce(b.status::text, '')
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);

      execute format($sql$
        insert into tmp_legacy_import_batch_map(schema_name, legacy_id, public_id)
        select %L, b.id, p.id
        from %I.import_batches b
        join public.import_batches p
          on p.workspace_id = %L::uuid
         and p.filename = b.filename
         and coalesce(p.created_at, now()) = coalesce(b.created_at, now())
         and coalesce(p.status::text, '') = coalesce(b.status::text, '')
        on conflict (schema_name, legacy_id) do update
        set public_id = excluded.public_id
      $sql$, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'lotes_importacao') then
      execute format($sql$
        insert into public.lotes_importacao (
          workspace_id, arquivo, tipo_arquivo, status,
          total_lidas, total_validas, total_invalidas, total_inseridas, total_duplicadas, erros, created_at
        )
        select
          %L::uuid, li.arquivo, li.tipo_arquivo, li.status,
          li.total_lidas, li.total_validas, li.total_invalidas, li.total_inseridas, li.total_duplicadas, li.erros, coalesce(li.created_at, now())
        from %I.lotes_importacao li
        where not exists (
          select 1
          from public.lotes_importacao p
          where p.workspace_id = %L::uuid
            and p.arquivo = li.arquivo
            and coalesce(p.created_at, now()) = coalesce(li.created_at, now())
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);

      execute format($sql$
        insert into tmp_legacy_lote_map(schema_name, legacy_id, public_id)
        select %L, li.id, p.id
        from %I.lotes_importacao li
        join public.lotes_importacao p
          on p.workspace_id = %L::uuid
         and p.arquivo = li.arquivo
         and coalesce(p.created_at, now()) = coalesce(li.created_at, now())
        on conflict (schema_name, legacy_id) do update
        set public_id = excluded.public_id
      $sql$, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;
  end loop;
end $$;

do $$
declare
  ws record;
begin
  for ws in select * from tmp_legacy_workspace_map order by schema_name loop
    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'service_orders') then
      execute format($sql$
        insert into public.service_orders (
          workspace_id, os_number, activity_type, reason, solution, technician_id, client_name,
          city, plan, opened_at, closed_at, sla_target_hours, sla_corrido_seconds, sla_util_seconds,
          within_sla_corrido, within_sla_util, import_batch_id, period_month, period_year, created_at
        )
        select
          %L::uuid, so.os_number, so.activity_type, so.reason, so.solution, tm.public_id, so.client_name,
          so.city, so.plan, so.opened_at, so.closed_at, so.sla_target_hours, so.sla_corrido_seconds, so.sla_util_seconds,
          so.within_sla_corrido, so.within_sla_util, ibm.public_id, so.period_month, so.period_year, coalesce(so.created_at, now())
        from %I.service_orders so
        left join tmp_legacy_technician_map tm on tm.schema_name = %L and tm.legacy_id = so.technician_id
        left join tmp_legacy_import_batch_map ibm on ibm.schema_name = %L and ibm.legacy_id = so.import_batch_id
        where not exists (
          select 1
          from public.service_orders p
          where p.workspace_id = %L::uuid
            and coalesce(p.os_number, '') = coalesce(so.os_number, '')
            and p.activity_type = so.activity_type
            and coalesce(p.opened_at, timestamp 'epoch') = coalesce(so.opened_at, timestamp 'epoch')
            and coalesce(p.technician_id, -1) = coalesce(tm.public_id, -1)
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'quality_records') then
      execute format($sql$
        insert into public.quality_records (
          workspace_id, os_number, indicator, reason, solution, technician_id, technician_name, client_name,
          city, plan, opened_at, closed_at, duration_seconds, period_month, period_year, created_at
        )
        select
          %L::uuid, qr.os_number, qr.indicator, qr.reason, qr.solution, tm.public_id, qr.technician_name, qr.client_name,
          qr.city, qr.plan, qr.opened_at, qr.closed_at, qr.duration_seconds, qr.period_month, qr.period_year, coalesce(qr.created_at, now())
        from %I.quality_records qr
        left join tmp_legacy_technician_map tm on tm.schema_name = %L and tm.legacy_id = qr.technician_id
        where not exists (
          select 1
          from public.quality_records p
          where p.workspace_id = %L::uuid
            and coalesce(p.os_number, '') = coalesce(qr.os_number, '')
            and p.indicator = qr.indicator
            and coalesce(p.opened_at, timestamp 'epoch') = coalesce(qr.opened_at, timestamp 'epoch')
            and coalesce(p.technician_id, -1) = coalesce(tm.public_id, -1)
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'support_records') then
      execute format($sql$
        insert into public.support_records (
          workspace_id, attendant_name, opened_manut_ext, percentage, without_manut, total, period_month, period_year, created_at
        )
        select
          %L::uuid, sr.attendant_name, sr.opened_manut_ext, sr.percentage, sr.without_manut, sr.total, sr.period_month, sr.period_year, coalesce(sr.created_at, now())
        from %I.support_records sr
        where not exists (
          select 1
          from public.support_records p
          where p.workspace_id = %L::uuid
            and p.attendant_name = sr.attendant_name
            and p.period_month = sr.period_month
            and p.period_year = sr.period_year
            and coalesce(p.total, -1) = coalesce(sr.total, -1)
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'support_call_categories') then
      execute format($sql$
        insert into public.support_call_categories (
          workspace_id, categoria, quantidade, percentual, period_month, period_year, created_at
        )
        select
          %L::uuid, scc.categoria, scc.quantidade, scc.percentual, scc.period_month, scc.period_year, coalesce(scc.created_at, now())
        from %I.support_call_categories scc
        where not exists (
          select 1
          from public.support_call_categories p
          where p.workspace_id = %L::uuid
            and p.categoria = scc.categoria
            and p.period_month = scc.period_month
            and p.period_year = scc.period_year
            and p.quantidade = scc.quantidade
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'sales_records') then
      execute format($sql$
        insert into public.sales_records (
          workspace_id, record_type, origin_sector, csv_category, client_name, city, source, indication,
          plan, observation, requested_at, installed_at, period_month, period_year, created_at
        )
        select
          %L::uuid, sr.record_type, coalesce(sr.origin_sector, 'vendas'), coalesce(sr.csv_category, 'padrao'),
          sr.client_name, sr.city, sr.source, sr.indication, sr.plan, sr.observation, sr.requested_at, sr.installed_at,
          sr.period_month, sr.period_year, coalesce(sr.created_at, now())
        from %I.sales_records sr
        where not exists (
          select 1
          from public.sales_records p
          where p.workspace_id = %L::uuid
            and p.record_type = sr.record_type
            and coalesce(p.client_name, '') = coalesce(sr.client_name, '')
            and coalesce(p.requested_at, timestamp 'epoch') = coalesce(sr.requested_at, timestamp 'epoch')
            and coalesce(p.installed_at, timestamp 'epoch') = coalesce(sr.installed_at, timestamp 'epoch')
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'cancellation_records') then
      execute format($sql$
        insert into public.cancellation_records (
          workspace_id, origin_sector, client_name, city, reason, source, plan, observation, cancelled_at, period_month, period_year, created_at
        )
        select
          %L::uuid, coalesce(cr.origin_sector, 'retencao'), cr.client_name, cr.city, cr.reason, cr.source, cr.plan, cr.observation,
          cr.cancelled_at, cr.period_month, cr.period_year, coalesce(cr.created_at, now())
        from %I.cancellation_records cr
        where not exists (
          select 1
          from public.cancellation_records p
          where p.workspace_id = %L::uuid
            and coalesce(p.client_name, '') = coalesce(cr.client_name, '')
            and coalesce(p.cancelled_at, timestamp 'epoch') = coalesce(cr.cancelled_at, timestamp 'epoch')
            and coalesce(p.reason, '') = coalesce(cr.reason, '')
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'infrastructure_records') then
      execute format($sql$
        insert into public.infrastructure_records (
          workspace_id, title, category, city, reference_date, payload, period_month, period_year, created_at
        )
        select
          %L::uuid, ir.title, ir.category, ir.city, ir.reference_date, ir.payload, ir.period_month, ir.period_year, coalesce(ir.created_at, now())
        from %I.infrastructure_records ir
        where not exists (
          select 1
          from public.infrastructure_records p
          where p.workspace_id = %L::uuid
            and coalesce(p.title, '') = coalesce(ir.title, '')
            and coalesce(p.category, '') = coalesce(ir.category, '')
            and coalesce(p.reference_date, timestamp 'epoch') = coalesce(ir.reference_date, timestamp 'epoch')
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'importacoes_brutas') then
      execute format($sql$
        insert into public.importacoes_brutas (workspace_id, lote_importacao_id, raw_json, created_at)
        select
          %L::uuid, lm.public_id, ib.raw_json, coalesce(ib.created_at, now())
        from %I.importacoes_brutas ib
        left join tmp_legacy_lote_map lm on lm.schema_name = %L and lm.legacy_id = ib.lote_importacao_id
        where not exists (
          select 1
          from public.importacoes_brutas p
          where p.workspace_id = %L::uuid
            and coalesce(p.lote_importacao_id, -1) = coalesce(lm.public_id, -1)
            and p.raw_json = ib.raw_json
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'atendimentos') then
      execute format($sql$
        insert into public.atendimentos (
          workspace_id, numero_os, tipo, motivo, solucao, tecnico, tecnico_id, cliente, cidade, plano,
          data_abertura, hora_abertura, data_finalizacao, hora_finalizacao, abertura_at, finalizacao_at,
          intervalo, sla_horas, dentro_sla, sla_corrido_segundos, sla_util_segundos, dentro_sla_util,
          login, endereco, bairro, referencia, atendente, indicacao, mac, ativo, empresa, data_liberada,
          observacao, coordenadas, telefones, agendamento, hash_importacao, lote_importacao_id,
          period_month, period_year, created_at, updated_at
        )
        select
          %L::uuid, a.numero_os, a.tipo, a.motivo, a.solucao, a.tecnico, tm.public_id, a.cliente, a.cidade, a.plano,
          a.data_abertura, a.hora_abertura, a.data_finalizacao, a.hora_finalizacao, a.abertura_at, a.finalizacao_at,
          a.intervalo, a.sla_horas, a.dentro_sla, a.sla_corrido_segundos, a.sla_util_segundos, a.dentro_sla_util,
          a.login, a.endereco, a.bairro, a.referencia, a.atendente, a.indicacao, a.mac, a.ativo, a.empresa, a.data_liberada,
          a.observacao, a.coordenadas, a.telefones, a.agendamento, a.hash_importacao, lm.public_id,
          a.period_month, a.period_year, coalesce(a.created_at, now()), coalesce(a.updated_at, now())
        from %I.atendimentos a
        left join tmp_legacy_technician_map tm on tm.schema_name = %L and tm.legacy_id = a.tecnico_id
        left join tmp_legacy_lote_map lm on lm.schema_name = %L and lm.legacy_id = a.lote_importacao_id
        where not exists (
          select 1
          from public.atendimentos p
          where p.workspace_id = %L::uuid
            and p.hash_importacao = a.hash_importacao
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;
  end loop;
end $$;

commit;
