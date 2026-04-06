alter table public.workspaces
  add column if not exists updated_at timestamp default now();
--> statement-breakpoint
update public.workspaces
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
--> statement-breakpoint
alter table public.workspaces
  alter column updated_at set not null;
--> statement-breakpoint

alter table public.workspace_members
  add column if not exists updated_at timestamp default now();
--> statement-breakpoint
update public.workspace_members
set updated_at = coalesce(updated_at, granted_at, now())
where updated_at is null;
--> statement-breakpoint
alter table public.workspace_members
  alter column updated_at set not null;
--> statement-breakpoint

alter table public.permissions
  add column if not exists updated_at timestamp default now();
--> statement-breakpoint
update public.permissions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
--> statement-breakpoint
alter table public.permissions
  alter column updated_at set not null;
--> statement-breakpoint

drop index if exists public.workspace_slug_idx;
--> statement-breakpoint
drop index if exists public.permission_key_idx;
