'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

/**
 * Precedência de tema:
 * 1. Preferência manual do usuário por workspace (localStorage `dwm_theme_{slug}`)
 * 2. defaultTheme do workspace (aplicado apenas na primeira visita ou se preferência limpa)
 * 3. Tema padrão do sistema ('dark')
 *
 * O WorkspaceThemeSync só sobrescreve o tema se o usuário NÃO tiver uma preferência
 * manual salva para o workspace ativo. Isso garante que o toggle do usuário seja sempre
 * respeitado sem ser revertido ao navegar entre páginas.
 */
export const THEME_PREF_KEY = (slug: string) => `dwm_theme_${slug}`;

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

      // If the user has already manually set a theme for this workspace, respect it.
      const userPref = localStorage.getItem(THEME_PREF_KEY(workspaceSlug)) as 'dark' | 'light' | null;
      if (userPref === 'dark' || userPref === 'light') {
        if (!cancelled && userPref !== resolvedTheme) {
          setTheme(userPref);
        }
        return;
      }

      // No user preference: apply the workspace's defaultTheme.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
