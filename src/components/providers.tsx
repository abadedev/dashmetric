'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

function WorkspaceThemeSync() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function syncTheme() {
      const parts = pathname.split('/').filter(Boolean);
      const reserved = new Set(['admin', 'auth', 'api', 'waiting', 'welcome']);
      const slugFromPath = parts[0] && !reserved.has(parts[0]) ? parts[0] : null;
      const cookieMatch = document.cookie
        .split('; ')
        .find((item) => item.startsWith('dwm_active_workspace='));
      const slugFromCookie = cookieMatch ? decodeURIComponent(cookieMatch.split('=')[1] ?? '') : null;
      const workspaceSlug = slugFromPath ?? slugFromCookie;

      if (!workspaceSlug) return;

      try {
        const response = await fetch('/api/workspaces/my', { credentials: 'same-origin' });
        if (!response.ok) return;
        const payload = await response.json() as {
          data?: Array<{ slug: string; defaultTheme?: 'dark' | 'light' }>;
        };
        const activeWorkspace = payload.data?.find((workspace) => workspace.slug === workspaceSlug);
        const defaultTheme = activeWorkspace?.defaultTheme;

        if (!cancelled && (defaultTheme === 'dark' || defaultTheme === 'light') && defaultTheme !== resolvedTheme) {
          setTheme(defaultTheme);
        }
      } catch {
        // Ignore theme sync failures and keep the current theme.
      }
    }

    syncTheme();

    return () => {
      cancelled = true;
    };
  }, [pathname, resolvedTheme, setTheme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 2 * 60 * 1000,
        retry: (failureCount, error) => {
          // Não tenta novamente em erros de autenticação/autorização
          if (error instanceof Error && /\b(401|403)\b/.test(error.message)) return false;
          return failureCount < 2;
        },
      },
    },
  }));

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
      <WorkspaceThemeSync />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
