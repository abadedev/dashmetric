'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Plus, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { WorkspaceWithRole } from '@/lib/workspace';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Leitor',
};

function WorkspaceAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const sizeClasses = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={cn('rounded-md object-cover', sizeClasses)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 font-semibold text-foreground',
        sizeClasses
      )}
    >
      {initials}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole;
  userRole: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  userRole,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const canCreate = userRole === 'admin';

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  function switchWorkspace(targetSlug: string) {
    if (targetSlug === activeWorkspace.slug) return;
    document.cookie = `dwm_active_workspace=${targetSlug};path=/;max-age=2592000;samesite=lax`;
    document.cookie = `workspace_access_ok=;path=/;max-age=0`;
    router.push(`/${targetSlug}/dashboard`);
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          logoUrl: logoUrl.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar workspace');
        return;
      }
      setCreateOpen(false);
      setName('');
      setSlug('');
      setLogoUrl('');
      router.refresh();
    } catch {
      setError('Erro ao criar workspace');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Popover>
        {/* Base UI Trigger renders a <button> natively — style it directly */}
        <PopoverTrigger
          className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-sidebar-border/70 hover:bg-sidebar-accent/70"
        >
          <WorkspaceAvatar name={activeWorkspace.name} logoUrl={activeWorkspace.logoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground leading-none">
              {activeWorkspace.name}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        </PopoverTrigger>

        <PopoverContent side="bottom" align="start" className="w-64 rounded-2xl border-border/70 bg-popover/95 p-1.5 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.28)] backdrop-blur-xl" sideOffset={6}>
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Workspaces
          </p>

          <div className="space-y-0.5">
            {workspaces.map((ws) => {
              const isActive = ws.slug === activeWorkspace.slug;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => switchWorkspace(ws.slug)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <WorkspaceAvatar name={ws.name} logoUrl={ws.logoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{ws.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ROLE_LABELS[ws.role] ?? ws.role}
                    </p>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                </button>
              );
            })}
          </div>

          {canCreate && (
            <>
              <div className="my-1.5 h-px bg-border" />
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Novo Workspace
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Create workspace dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-foreground" />
              <DialogTitle>Criar Workspace</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Nome</Label>
              <Input
                id="ws-name"
                placeholder="Ex: Acme Corp"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-slug">Slug (URL)</Label>
              <Input
                id="ws-slug"
                placeholder="acme-corp"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Usado internamente para identificar o workspace.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-logo">
                URL do Logo{' '}
                <Badge variant="secondary" className="text-[10px]">
                  opcional
                </Badge>
              </Label>
              <Input
                id="ws-logo"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || creating}
            >
              {creating ? 'Criando...' : 'Criar Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
