-- Finalize multi-workspace constraints after public.* backfill is complete.
-- Preconditions:
-- 1. All workspace-scoped tables have workspace_id populated.
-- 2. 01_audit_workspace_unification.sql shows no collisions for the composite uniques below.
-- 3. 02_migrate_legacy_operational_data.sql has already been executed.

begin;

set local search_path to public;

alter table public.technicians
  add constraint technicians_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.import_batches
  add constraint import_batches_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.service_orders
  add constraint service_orders_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.quality_records
  add constraint quality_records_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.support_records
  add constraint support_records_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.support_call_categories
  add constraint support_call_categories_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.system_modules
  add constraint system_modules_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.sales_records
  add constraint sales_records_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.cancellation_records
  add constraint cancellation_records_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.infrastructure_records
  add constraint infrastructure_records_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.sla_targets
  add constraint sla_targets_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.sla_config
  add constraint sla_config_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.lotes_importacao
  add constraint lotes_importacao_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.importacoes_brutas
  add constraint importacoes_brutas_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;
alter table public.atendimentos
  add constraint atendimentos_workspace_id_workspaces_id_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade not valid;

alter table public.technicians validate constraint technicians_workspace_id_workspaces_id_fk;
alter table public.import_batches validate constraint import_batches_workspace_id_workspaces_id_fk;
alter table public.service_orders validate constraint service_orders_workspace_id_workspaces_id_fk;
alter table public.quality_records validate constraint quality_records_workspace_id_workspaces_id_fk;
alter table public.support_records validate constraint support_records_workspace_id_workspaces_id_fk;
alter table public.support_call_categories validate constraint support_call_categories_workspace_id_workspaces_id_fk;
alter table public.system_modules validate constraint system_modules_workspace_id_workspaces_id_fk;
alter table public.sales_records validate constraint sales_records_workspace_id_workspaces_id_fk;
alter table public.cancellation_records validate constraint cancellation_records_workspace_id_workspaces_id_fk;
alter table public.infrastructure_records validate constraint infrastructure_records_workspace_id_workspaces_id_fk;
alter table public.sla_targets validate constraint sla_targets_workspace_id_workspaces_id_fk;
alter table public.sla_config validate constraint sla_config_workspace_id_workspaces_id_fk;
alter table public.lotes_importacao validate constraint lotes_importacao_workspace_id_workspaces_id_fk;
alter table public.importacoes_brutas validate constraint importacoes_brutas_workspace_id_workspaces_id_fk;
alter table public.atendimentos validate constraint atendimentos_workspace_id_workspaces_id_fk;

alter table public.technicians alter column workspace_id set not null;
alter table public.import_batches alter column workspace_id set not null;
alter table public.service_orders alter column workspace_id set not null;
alter table public.quality_records alter column workspace_id set not null;
alter table public.support_records alter column workspace_id set not null;
alter table public.support_call_categories alter column workspace_id set not null;
alter table public.system_modules alter column workspace_id set not null;
alter table public.sales_records alter column workspace_id set not null;
alter table public.cancellation_records alter column workspace_id set not null;
alter table public.infrastructure_records alter column workspace_id set not null;
alter table public.sla_targets alter column workspace_id set not null;
alter table public.sla_config alter column workspace_id set not null;
alter table public.lotes_importacao alter column workspace_id set not null;
alter table public.importacoes_brutas alter column workspace_id set not null;
alter table public.atendimentos alter column workspace_id set not null;

alter table public.sla_targets drop constraint if exists sla_targets_activity_type_unique;
alter table public.sla_config drop constraint if exists sla_config_pkey;

drop index if exists public.tech_name_idx;
create unique index tech_workspace_name_uidx
  on public.technicians (workspace_id, lower(name));

drop index if exists public.system_module_slug_idx;
drop index if exists public.system_module_href_idx;
create unique index system_module_workspace_slug_uidx
  on public.system_modules (workspace_id, slug);
create unique index system_module_workspace_href_uidx
  on public.system_modules (workspace_id, href);

create unique index sla_target_workspace_activity_type_uidx
  on public.sla_targets (workspace_id, activity_type);

drop index if exists public.atend_ws_hash_idx;
create unique index atend_workspace_hash_uidx
  on public.atendimentos (workspace_id, hash_importacao);

create unique index if not exists sla_config_workspace_key_uidx
  on public.sla_config (workspace_id, key);

create index if not exists technicians_workspace_login_idx
  on public.technicians (workspace_id, login);
create index if not exists quality_workspace_technician_idx
  on public.quality_records (workspace_id, technician_id, period_year, period_month);
create index if not exists atend_workspace_tecnico_idx
  on public.atendimentos (workspace_id, tecnico_id, period_year, period_month);
create index if not exists support_workspace_attendant_period_idx
  on public.support_records (workspace_id, attendant_name, period_year, period_month);
create index if not exists support_category_workspace_period_idx
  on public.support_call_categories (workspace_id, categoria, period_year, period_month);
create index if not exists sales_workspace_type_period_idx
  on public.sales_records (workspace_id, record_type, period_year, period_month);
create index if not exists cancellation_workspace_reason_period_idx
  on public.cancellation_records (workspace_id, period_year, period_month);
create index if not exists infrastructure_workspace_category_period_idx
  on public.infrastructure_records (workspace_id, category, period_year, period_month);

commit;
