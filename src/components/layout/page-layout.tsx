'use client';

import { cn } from '@/lib/utils';

interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PageLayout({ title, description, actions, children, fullWidth }: PageLayoutProps) {
  return (
    <div className={cn('flex w-full flex-col gap-6', fullWidth ? '' : 'mx-auto max-w-[1320px]')}>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white_4%),color-mix(in_oklab,var(--background)_98%,black_2%))] px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.26)] backdrop-blur-sm lg:px-7 lg:py-6">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Dashmetric
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground md:text-[1.95rem]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground lg:text-[0.95rem]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">{actions}</div>}
      </div>

      <div className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}
