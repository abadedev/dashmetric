// @ts-nocheck
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu, Shield, ChevronDown, Sun, Moon, Building2, Check, Plus, UserPlus, LogOutIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { signOut, useSession } from '@/lib/auth-client';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const ROLE_LABELS = {
  admin: 'Administrador',
  editor: 'Editor',
  user: 'Usuário',
};

const WS_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Leitor',
};

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Workspace state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [wsLogoUrl, setWsLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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

  // Detect active workspace slug from URL path
  const parts = pathname.split('/').filter(Boolean);
  const RESERVED = new Set(['api', 'auth', 'waiting', 'welcome', 'admin', 'dashboard', 'atendimentos', 'qualidade', 'ranking', 'resumo-sla', 'suporte', 'upload', 'vendas', 'cancelamentos', 'infraestrutura']);
  const workspaceSlugFromUrl = parts.length >= 2 && !RESERVED.has(parts[0]) ? parts[0] : null;

  // Fetch user's workspaces
  const { data: wsData, refetch: refetchWs } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces/my');
      return res.json() as Promise<{ data: Array<{ id: string; name: string; slug: string; logoUrl: string | null; role: string }> }>;
    },
    staleTime: 30_000,
  });
  const workspaces = wsData?.data ?? [];
  const activeWorkspace = workspaceSlugFromUrl
    ? workspaces.find((w) => w.slug === workspaceSlugFromUrl)
    : workspaces[0];

  function switchWorkspace(slug: string) {
    if (slug === activeWorkspace?.slug) return;
    document.cookie = `dwm_active_workspace=${slug};path=/;max-age=${86400 * 30};samesite=lax`;
    document.cookie = `workspace_access_ok=;path=/;max-age=0`;
    router.push(`/${slug}/dashboard`);
  }

  async function handleLogout() {
    await signOut();
    router.push('/auth');
    router.refresh();
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/workspaces/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceSlug: activeWorkspace.slug, email: inviteEmail.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setInviteMsg({ ok: false, text: d.error ?? 'Erro ao convidar' });
      } else {
        setInviteMsg({ ok: true, text: `${d.user?.name ?? inviteEmail} adicionado com sucesso!` });
        setInviteEmail('');
      }
    } catch {
      setInviteMsg({ ok: false, text: 'Erro ao convidar usuário' });
    } finally {
      setInviting(false);
    }
  }

  async function handleCreateWorkspace() {
    if (!wsName.trim() || !wsSlug.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wsName.trim(), slug: wsSlug.trim(), logoUrl: wsLogoUrl.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) { setCreateError(d.error ?? 'Erro ao criar workspace'); return; }
      setCreateOpen(false);
      setWsName(''); setWsSlug(''); setWsLogoUrl('');
      refetchWs();
      router.push(`/${wsSlug.trim()}/dashboard`);
    } catch {
      setCreateError('Erro ao criar workspace');
    } finally {
      setCreating(false);
    }
  }

  const canInvite = isAdmin || activeWorkspace?.role === 'ADMIN';

  return (
    <>
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

        {/* Breadcrumbs */}
        <div className="hidden md:flex ml-2">
          <Breadcrumb />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-border/80 hover:bg-accent/70 hover:text-foreground"
          >
            {!mounted ? <span className="h-4 w-4" /> : theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="mx-1 h-6 w-px bg-border/80" />

          {/* User + Workspace Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className="flex items-center gap-2.5 rounded-2xl border border-transparent px-2 py-1.5 outline-none transition-all hover:border-border/70 hover:bg-card/80 focus-visible:border-border/70 focus-visible:bg-card/80"
              aria-label="Abrir menu da conta"
            >
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs text-muted-foreground leading-none mb-0.5">{roleLabel}</span>
                <span className="text-sm font-semibold truncate max-w-44 leading-none text-foreground">{userName}</span>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-xs font-bold text-primary ring-1 ring-primary/15">
                {user?.image ? (
                  <img src={user.image} alt={userName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : initials}
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 rounded-2xl border-border/70 bg-popover/95 shadow-[0_18px_48px_-22px_color-mix(in_oklab,var(--foreground)_20%,transparent)] backdrop-blur-xl">
              {/* User info */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/15">
                      {user?.image ? (
                        <img src={user.image} alt={userName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-sm">{userName}</div>
                      <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Workspace section */}
              {workspaces.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Workspace ativo
                    </p>
                    {activeWorkspace && (
                      <div className="mt-1 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium text-foreground">{activeWorkspace.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                          {WS_ROLE_LABELS[activeWorkspace.role] ?? activeWorkspace.role}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {workspaces.length > 1 && (
                    <div className="px-1.5 pb-1">
                      {workspaces
                        .filter((w) => w.slug !== activeWorkspace?.slug)
                        .map((ws) => (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => switchWorkspace(ws.slug)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{ws.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">{WS_ROLE_LABELS[ws.role] ?? ws.role}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Workspace actions */}
                  <div className="px-1.5 pb-1.5 space-y-0.5">
                    {canInvite && (
                      <DropdownMenuItem onClick={() => { setInviteMsg(null); setInviteEmail(''); setInviteOpen(true); }}>
                        <UserPlus className="h-4 w-4" />
                        Convidar membro
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => { setCreateError(''); setWsName(''); setWsSlug(''); setWsLogoUrl(''); setCreateOpen(true); }}>
                        <Plus className="h-4 w-4" />
                        Novo workspace
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push('/waiting')}>
                      <LogOutIcon className="h-4 w-4" />
                      Sair do workspace
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                </>
              )}

              {/* App actions */}
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

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteMsg(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <DialogTitle>Convidar membro</DialogTitle>
            </div>
            {activeWorkspace && (
              <p className="text-sm text-muted-foreground pt-0.5">
                Workspace: <span className="font-medium text-foreground">{activeWorkspace.name}</span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-mail do usuário</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <p className="text-xs text-muted-foreground">
                O usuário precisa ter feito login na plataforma ao menos uma vez.
              </p>
            </div>
            {inviteMsg && (
              <p className={cn('text-sm', inviteMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                {inviteMsg.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Fechar</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? 'Convidando...' : 'Convidar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create workspace dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <DialogTitle>Criar Workspace</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cws-name">Nome</Label>
              <Input id="cws-name" placeholder="Ex: Acme Corp" value={wsName}
                onChange={(e) => { setWsName(e.target.value); setWsSlug(slugify(e.target.value)); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cws-slug">Slug (URL)</Label>
              <Input id="cws-slug" placeholder="acme-corp" value={wsSlug}
                onChange={(e) => setWsSlug(slugify(e.target.value))} />
              <p className="text-xs text-muted-foreground">Identificador único: /{wsSlug || 'slug'}/dashboard</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cws-logo">URL do Logo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input id="cws-logo" placeholder="https://..." value={wsLogoUrl}
                onChange={(e) => setWsLogoUrl(e.target.value)} />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateWorkspace} disabled={!wsName.trim() || !wsSlug.trim() || creating}>
              {creating ? 'Criando...' : 'Criar Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
