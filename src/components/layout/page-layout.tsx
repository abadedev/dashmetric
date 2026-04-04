'use client';

interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-border/60 bg-card/72 px-5 py-5 shadow-[0_10px_30px_-18px_color-mix(in_oklab,var(--foreground)_18%,transparent)] backdrop-blur-sm lg:px-7 lg:py-6">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">
            Dashmetric
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.95rem]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground lg:text-[0.95rem]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>

      {/* Page Content */}
      <div className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}
