alter table public.access_groups
  add column if not exists workspace_id uuid;
--> statement-breakpoint
alter table public.user_groups
  add column if not exists workspace_id uuid;
--> statement-breakpoint
alter table public.user_permissions
  add column if not exists workspace_id uuid;
--> statement-breakpoint

with fallback_workspace as (
  select id
  from public.workspaces
  order by created_at asc, slug asc
  limit 1
)
update public.access_groups
set workspace_id = fallback_workspace.id
from fallback_workspace
where public.access_groups.workspace_id is null;
--> statement-breakpoint

update public.user_groups ug
set workspace_id = ag.workspace_id
from public.access_groups ag
where ug.workspace_id is null
  and ug.group_id = ag.id;
--> statement-breakpoint

with fallback_workspace as (
  select id
  from public.workspaces
  order by created_at asc, slug asc
  limit 1
)
update public.user_permissions up
set workspace_id = fallback_workspace.id
from fallback_workspace
where up.workspace_id is null;
--> statement-breakpoint

alter table public.access_groups
  alter column workspace_id set not null;
--> statement-breakpoint
alter table public.user_groups
  alter column workspace_id set not null;
--> statement-breakpoint
alter table public.user_permissions
  alter column workspace_id set not null;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'access_groups_workspace_id_workspaces_id_fk'
  ) then
    alter table public.access_groups
      add constraint access_groups_workspace_id_workspaces_id_fk
      foreign key (workspace_id) references public.workspaces(id) on delete cascade;
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_groups_workspace_id_workspaces_id_fk'
  ) then
    alter table public.user_groups
      add constraint user_groups_workspace_id_workspaces_id_fk
      foreign key (workspace_id) references public.workspaces(id) on delete cascade;
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_permissions_workspace_id_workspaces_id_fk'
  ) then
    alter table public.user_permissions
      add constraint user_permissions_workspace_id_workspaces_id_fk
      foreign key (workspace_id) references public.workspaces(id) on delete cascade;
  end if;
end $$;
--> statement-breakpoint

create unique index if not exists access_group_workspace_name_idx
  on public.access_groups(workspace_id, name);
--> statement-breakpoint
create unique index if not exists access_group_id_workspace_idx
  on public.access_groups(id, workspace_id);
--> statement-breakpoint
create index if not exists access_group_workspace_idx
  on public.access_groups(workspace_id);
--> statement-breakpoint

drop index if exists public.user_group_unique_idx;
--> statement-breakpoint
create unique index if not exists user_group_unique_idx
  on public.user_groups(workspace_id, user_id, group_id);
--> statement-breakpoint
create index if not exists user_group_workspace_user_idx
  on public.user_groups(workspace_id, user_id);
--> statement-breakpoint
create index if not exists user_group_workspace_group_idx
  on public.user_groups(workspace_id, group_id);
--> statement-breakpoint

drop index if exists public.user_permission_unique_idx;
--> statement-breakpoint
create unique index if not exists user_permission_unique_idx
  on public.user_permissions(workspace_id, user_id, permission_id);
--> statement-breakpoint
create index if not exists user_permission_workspace_user_idx
  on public.user_permissions(workspace_id, user_id);
--> statement-breakpoint
create index if not exists user_permission_workspace_permission_idx
  on public.user_permissions(workspace_id, permission_id);
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_groups_group_workspace_fk'
  ) then
    alter table public.user_groups
      add constraint user_groups_group_workspace_fk
      foreign key (group_id, workspace_id)
      references public.access_groups(id, workspace_id)
      on delete cascade;
  end if;
end $$;
