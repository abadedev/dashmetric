// @ts-nocheck
'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Menu, Shield, ChevronDown, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut, useSession } from '@/lib/auth-client';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const ROLE_LABELS = {
  admin: 'Administrador',
  editor: 'Editor',
  user: 'Usuário',
};

export function Header() {
  const router = useRouter();
  const { data } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const user = data?.user;
  const isAdmin = user?.role === 'admin';
  const userName = user?.name?.trim() || 'Usuário';
  const roleLabel = ROLE_LABELS[user?.role] || 'Usuário';
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US';

  async function handleLogout() {
    await signOut();
    router.push('/auth');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center gap-3 border-b border-border/70 bg-background/70 px-4 shadow-[0_10px_28px_-24px_color-mix(in_oklab,var(--foreground)_20%,transparent)] backdrop-blur-xl md:px-6">
      {/* Mobile Menu */}
      <div className="md:hidden shrink-0">
        <Sheet>
          <SheetTrigger className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 shrink-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            <div className="h-full relative isolate z-50">
              <Sidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Breadcrumbs (hidden on small screens to save space) */}
      <div className="hidden md:flex ml-2">
        <Breadcrumb />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-border/80 hover:bg-accent/70 hover:text-foreground"
        >
          {!mounted ? (
            <span className="h-4 w-4" />
          ) : theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-border/80" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className="flex items-center gap-2.5 rounded-2xl border border-transparent px-2 py-1.5 outline-none transition-all hover:border-border/70 hover:bg-card/80 focus-visible:border-border/70 focus-visible:bg-card/80"
            aria-label="Abrir menu da conta"
          >
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-muted-foreground leading-none mb-0.5">
                {roleLabel}
              </span>
              <span className="text-sm font-semibold truncate max-w-44 leading-none text-foreground">
                {userName}
              </span>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-xs font-bold text-primary ring-1 ring-primary/15">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={userName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </div>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border/70 bg-popover/95 shadow-[0_18px_48px_-22px_color-mix(in_oklab,var(--foreground)_20%,transparent)] backdrop-blur-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/15">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={userName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-sm">{userName}</div>
                    <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {isAdmin && (
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <Shield className="h-4 w-4" />
                Painel ADM
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
