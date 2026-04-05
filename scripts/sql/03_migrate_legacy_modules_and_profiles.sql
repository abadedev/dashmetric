-- Migrate legacy system_modules + module_import_profiles from old schemas into public.*
-- IMPORTANT:
-- Run this only after 04_finalize_workspace_constraints.sql has replaced the
-- global unique indexes on public.system_modules(slug/href) with workspace-scoped uniques.

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

create temp table tmp_legacy_module_map (
  schema_name text not null,
  legacy_id integer not null,
  public_id integer not null,
  primary key (schema_name, legacy_id)
) on commit drop;

do $$
declare
  ws record;
begin
  for ws in select * from tmp_legacy_workspace_map order by schema_name loop
    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'system_modules') then
      execute format($sql$
        insert into public.system_modules (
          workspace_id, name, slug, description, icon, href, sort_order, is_active,
          show_in_sidebar, allow_import, required_role, template_source, is_editable, created_at, updated_at
        )
        select
          %L::uuid, sm.name, sm.slug, sm.description, sm.icon, sm.href, sm.sort_order,
          coalesce(sm.is_active, true), coalesce(sm.show_in_sidebar, true), coalesce(sm.allow_import, false),
          sm.required_role, sm.template_source, coalesce(sm.is_editable, true),
          coalesce(sm.created_at, now()), coalesce(sm.updated_at, now())
        from %I.system_modules sm
        where not exists (
          select 1
          from public.system_modules p
          where p.workspace_id = %L::uuid
            and (p.slug = sm.slug or p.href = sm.href)
        )
      $sql$, ws.workspace_id, ws.schema_name, ws.workspace_id);

      execute format($sql$
        insert into tmp_legacy_module_map(schema_name, legacy_id, public_id)
        select %L, sm.id, p.id
        from %I.system_modules sm
        join public.system_modules p
          on p.workspace_id = %L::uuid
         and (p.slug = sm.slug or p.href = sm.href)
        on conflict (schema_name, legacy_id) do update
        set public_id = excluded.public_id
      $sql$, ws.schema_name, ws.schema_name, ws.workspace_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = ws.schema_name and table_name = 'module_import_profiles') then
      execute format($sql$
        insert into public.module_import_profiles (
          module_id, profile_key, label, detector_type, parameters, is_active, created_at, updated_at
        )
        select
          mm.public_id, mip.profile_key, mip.label, mip.detector_type,
          coalesce(mip.parameters, '[]'::jsonb), coalesce(mip.is_active, true),
          coalesce(mip.created_at, now()), coalesce(mip.updated_at, now())
        from %I.module_import_profiles mip
        join tmp_legacy_module_map mm
          on mm.schema_name = %L
         and mm.legacy_id = mip.module_id
        where not exists (
          select 1
          from public.module_import_profiles p
          where p.module_id = mm.public_id
            and p.profile_key = mip.profile_key
        )
      $sql$, ws.schema_name, ws.schema_name);
    end if;
  end loop;
end $$;

commit;
