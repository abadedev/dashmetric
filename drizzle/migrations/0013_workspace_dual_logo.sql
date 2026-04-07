alter table public.workspaces
  add column if not exists logo_dark_url text;
--> statement-breakpoint
alter table public.workspaces
  add column if not exists logo_light_url text;
