-- Audit script for the single-schema + workspace_id migration.
-- Run with a role that can read pg_catalog and all target schemas.

set search_path to public;

select 'schemas' as section, nspname as schema_name
from pg_namespace
where nspname not in ('pg_catalog', 'information_schema')
  and nspname not like 'pg_toast%'
  and nspname not like 'pg_temp_%'
order by nspname;

select
  'tables_by_schema' as section,
  table_schema,
  table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name;

drop table if exists pg_temp.audit_table_counts;
create temp table audit_table_counts (
  table_schema text,
  table_name text,
  row_count bigint
);

do $$
declare
  rec record;
  row_count bigint;
begin
  for rec in
    select table_schema, table_name
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name
  loop
    execute format('select count(*) from %I.%I', rec.table_schema, rec.table_name)
      into row_count;

    insert into audit_table_counts(table_schema, table_name, row_count)
    values (rec.table_schema, rec.table_name, row_count);
  end loop;
end $$;

select 'row_counts' as section, table_schema, table_name, row_count
from audit_table_counts
order by table_schema, table_name;

select
  'public_tables_with_workspace_id' as section,
  c.table_name
from information_schema.columns c
where c.table_schema = 'public'
  and c.column_name = 'workspace_id'
group by c.table_name
order by c.table_name;

select
  'public_tables_without_workspace_id' as section,
  t.table_name
from information_schema.tables t
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = t.table_schema
      and c.table_name = t.table_name
      and c.column_name = 'workspace_id'
  )
order by t.table_name;

select
  'indexes' as section,
  schemaname as table_schema,
  tablename as table_name,
  indexname as index_name,
  indexdef as index_definition
from pg_indexes
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename, indexname;

select
  'unique_constraints' as section,
  n.nspname as table_schema,
  c.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where con.contype in ('u', 'p')
  and n.nspname not in ('pg_catalog', 'information_schema')
order by n.nspname, c.relname, con.conname;

with legacy_schemas as (
  select unnest(array['dstech', 'fleckinfo', 'teste2']) as schema_name
),
legacy_operational_tables as (
  select
    t.table_schema,
    t.table_name
  from information_schema.tables t
  join legacy_schemas ls on ls.schema_name = t.table_schema
  where t.table_type = 'BASE TABLE'
    and t.table_name in (
      'technicians',
      'import_batches',
      'service_orders',
      'quality_records',
      'support_records',
      'support_call_categories',
      'system_modules',
      'module_import_profiles',
      'sales_records',
      'cancellation_records',
      'infrastructure_records',
      'lotes_importacao',
      'importacoes_brutas',
      'atendimentos'
    )
)
select
  'legacy_operational_tables' as section,
  lot.table_schema,
  lot.table_name,
  coalesce(atc.row_count, 0) as row_count
from legacy_operational_tables lot
left join audit_table_counts atc
  on atc.table_schema = lot.table_schema
 and atc.table_name = lot.table_name
order by lot.table_schema, lot.table_name;

select
  'workspace_id_columns_public' as section,
  c.table_name,
  c.is_nullable,
  c.data_type
from information_schema.columns c
where c.table_schema = 'public'
  and c.column_name = 'workspace_id'
order by c.table_name;

select
  'public_workspace_scoped_tables_missing_fk' as section,
  c.table_name
from information_schema.columns c
where c.table_schema = 'public'
  and c.column_name = 'workspace_id'
  and not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = c.table_schema
      and tc.table_name = c.table_name
      and kcu.column_name = 'workspace_id'
  )
order by c.table_name;

select
  'collision_public_technicians_by_workspace_name' as section,
  workspace_id,
  lower(name) as normalized_name,
  count(*) as total
from public.technicians
where workspace_id is not null
group by workspace_id, lower(name)
having count(*) > 1
order by workspace_id, normalized_name;

select
  'collision_public_system_modules_by_workspace_slug' as section,
  workspace_id,
  slug,
  count(*) as total
from public.system_modules
where workspace_id is not null
group by workspace_id, slug
having count(*) > 1
order by workspace_id, slug;

select
  'collision_public_system_modules_by_workspace_href' as section,
  workspace_id,
  href,
  count(*) as total
from public.system_modules
where workspace_id is not null
group by workspace_id, href
having count(*) > 1
order by workspace_id, href;

select
  'collision_public_atendimentos_by_workspace_hash' as section,
  workspace_id,
  hash_importacao,
  count(*) as total
from public.atendimentos
where workspace_id is not null
group by workspace_id, hash_importacao
having count(*) > 1
order by workspace_id, hash_importacao;

select
  'collision_public_sla_targets_by_workspace_activity_type' as section,
  workspace_id,
  activity_type,
  count(*) as total
from public.sla_targets
where workspace_id is not null
group by workspace_id, activity_type
having count(*) > 1
order by workspace_id, activity_type;

select
  'collision_public_sla_config_by_workspace_key' as section,
  workspace_id,
  key,
  count(*) as total
from public.sla_config
where workspace_id is not null
group by workspace_id, key
having count(*) > 1
order by workspace_id, key;
