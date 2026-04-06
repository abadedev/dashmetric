alter table public.workspaces
  add column if not exists default_theme varchar(20) default 'dark';
--> statement-breakpoint
update public.workspaces
set default_theme = coalesce(nullif(default_theme, ''), 'dark')
where default_theme is null
   or default_theme = '';
--> statement-breakpoint
alter table public.workspaces
  alter column default_theme set not null;
