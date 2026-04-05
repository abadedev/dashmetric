-- Drop legacy workspace schemas only after migration + validation.
-- Preconditions:
-- 1. 01_audit_workspace_unification.sql has been executed before and after migration.
-- 2. 02_migrate_legacy_operational_data.sql has completed.
-- 3. 03_migrate_legacy_modules_and_profiles.sql has completed.
-- 4. Legacy row counts are fully represented in public via workspace_id.

begin;

set local search_path to public;

do $$
declare
  legacy_schema text;
  legacy_table record;
  public_count bigint;
  legacy_count bigint;
  workspace_uuid uuid;
begin
  foreach legacy_schema in array array['dstech', 'fleckinfo', 'teste2']
  loop
    if not exists (
      select 1
      from information_schema.schemata
      where schema_name = legacy_schema
    ) then
      continue;
    end if;

    select id
    into workspace_uuid
    from public.workspaces
    where slug = legacy_schema
    limit 1;

    if workspace_uuid is null then
      raise exception 'Workspace mapping not found for schema %', legacy_schema;
    end if;

    for legacy_table in
      select table_name
      from information_schema.tables
      where table_schema = legacy_schema
        and table_type = 'BASE TABLE'
        and table_name in (
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
      order by table_name
    loop
      execute format('select count(*) from %I.%I', legacy_schema, legacy_table.table_name)
      into legacy_count;

      if legacy_table.table_name = 'module_import_profiles' then
        execute $sql$
          select count(*)
          from public.module_import_profiles mip
          join public.system_modules sm on sm.id = mip.module_id
          where sm.workspace_id = $1
        $sql$
        into public_count
        using workspace_uuid;
      else
        execute format('select count(*) from public.%I where workspace_id = $1', legacy_table.table_name)
        into public_count
        using workspace_uuid;
      end if;

      if public_count < legacy_count then
        raise exception
          'Drop blocked: schema %, table %, legacy_count %, public_count %',
          legacy_schema, legacy_table.table_name, legacy_count, public_count;
      end if;
    end loop;
  end loop;
end $$;

drop schema if exists dstech cascade;
drop schema if exists fleckinfo cascade;
drop schema if exists teste2 cascade;

commit;
