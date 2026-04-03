'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';

export default function WaitingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAccess = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/workspaces/my');
      const data = (await res.json()) as { data?: { slug: string }[] };
      const workspaces = data.data ?? [];
      if (workspaces.length > 0 && workspaces[0]) {
        // Clear cache cookie and redirect
        document.cookie = 'workspace_access_ok=;path=/;max-age=0';
        router.replace('/dashboard');
        return;
      }
      setLastChecked(new Date());
    } catch {
      setLastChecked(new Date());
    } finally {
      setChecking(false);
    }
  }, [router]);

  // Auto-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkAccess, 30_000);
    return () => clearInterval(interval);
  }, [checkAccess]);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">DashMetric</h1>
            <p className="text-sm text-muted-foreground">NOC Performance Manager</p>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2 rounded-xl border border-border/60 bg-card px-6 py-5 shadow-sm">
          <p className="font-medium text-foreground">Aguardando liberação de acesso</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu acesso está sendo configurado. Aguarde a liberação de um administrador.
          </p>
          {lastChecked && (
            <p className="text-xs text-muted-foreground/60">
              Última verificação: {lastChecked.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          <Button
            variant="outline"
            onClick={checkAccess}
            disabled={checking}
            className="w-full"
          >
            {checking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {checking ? 'Verificando...' : 'Verificar acesso'}
          </Button>

          <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
