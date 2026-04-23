'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

type AppTheme = 'dark' | 'light';

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

/**
 * Precedencia de tema:
 * 1. Preferencia manual do usuario por workspace (localStorage `dwm_theme_{slug}`)
 * 2. defaultTheme do workspace (aplicado apenas na primeira visita ou se preferencia limpa)
 * 3. Tema padrao do sistema ('dark')
 */
export const THEME_PREF_KEY = (slug: string) => `dwm_theme_${slug}`;

export function useTheme() {
  return useContext(ThemeContext);
}

function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('dark');

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem('theme');
    const rootTheme = root.classList.contains('light')
      ? 'light'
      : root.classList.contains('dark')
        ? 'dark'
        : null;

    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeState(storedTheme);
      return;
    }

    if (rootTheme === 'light' || rootTheme === 'dark') {
      setThemeState(rootTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme: setThemeState,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

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

      const userPref = localStorage.getItem(THEME_PREF_KEY(workspaceSlug)) as AppTheme | null;
      if (userPref === 'dark' || userPref === 'light') {
        if (!cancelled && userPref !== resolvedTheme) {
          setTheme(userPref);
        }
        return;
      }

      try {
        const response = await fetch('/api/workspaces/my', { credentials: 'same-origin' });
        if (!response.ok) return;
        const payload = await response.json() as {
          data?: Array<{ slug: string; defaultTheme?: AppTheme }>;
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

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 2 * 60 * 1000,
            retry: (failureCount, error) => {
              if (error instanceof Error && /\b(401|403)\b/.test(error.message)) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <WorkspaceThemeSync />
        {children}
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
