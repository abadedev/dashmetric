'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers';

interface WorkspaceBrandProps {
  name: string;
  /** Legacy single logo — used as ultimate fallback */
  logoUrl?: string | null;
  /** Logo suitable for dark backgrounds */
  logoDarkUrl?: string | null;
  /** Logo suitable for light backgrounds */
  logoLightUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'sidebar';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-11 w-11 text-sm',
  sidebar: 'h-8 w-8 text-xs',
};

export function WorkspaceBrand({
  name,
  logoUrl,
  logoDarkUrl,
  logoLightUrl,
  size = 'md',
  className,
}: WorkspaceBrandProps) {
  const [imgError, setImgError] = useState(false);
  const { resolvedTheme } = useTheme();

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  // Precedence: theme-specific → opposite theme → legacy logoUrl → null
  const resolvedLogoUrl = imgError
    ? null
    : resolvedTheme === 'dark'
      ? (logoDarkUrl ?? logoUrl ?? logoLightUrl ?? null)
      : (logoLightUrl ?? logoUrl ?? logoDarkUrl ?? null);

  if (size === 'sidebar') {
    if (resolvedLogoUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedLogoUrl}
          alt={name}
          className={cn('h-8 w-auto max-w-[160px] object-contain', className)}
          onError={() => setImgError(true)}
        />
      );
    }
    return (
      <span
        className={cn(
          'text-base font-bold tracking-tight text-sidebar-foreground truncate max-w-[160px]',
          className,
        )}
      >
        {name}
      </span>
    );
  }

  if (resolvedLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedLogoUrl}
        alt={name}
        className={cn('rounded-md object-contain', sizeClasses[size], className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 font-semibold text-foreground',
        sizeClasses[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
