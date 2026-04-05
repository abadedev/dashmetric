'use client';

import { useState } from 'react';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient, signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMagicLoading(true);
    try {
      await authClient.signIn.magicLink({ email, callbackURL: '/dashboard' });
      setMagicSent(true);
    } catch {
      toast.error('Erro ao enviar o link de acesso.');
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signIn.social({ provider: 'google', callbackURL: '/' });
    } catch {
      toast.error('Erro ao autenticar com Google.');
      setGoogleLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20">
          <CheckCircle2 className="h-6 w-6 text-blue-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">Verifique seu e-mail</p>
          <p className="text-xs leading-relaxed text-white/50">
            Enviamos um link de acesso para{' '}
            <span className="font-medium text-white/70">{email}</span>
          </p>
        </div>
        <button
          onClick={() => { setMagicSent(false); setEmail(''); }}
          className="text-xs text-white/30 underline-offset-2 hover:text-white/60 hover:underline transition-colors"
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-white/70 text-xs">
            E-mail
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={magicLoading || !email}
          size="lg"
          className="w-full h-10 gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-[0_0_24px_-4px_rgba(59,130,246,0.4)] hover:shadow-[0_0_32px_-4px_rgba(59,130,246,0.6)] transition-all"
        >
          {magicLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Enviar link de acesso
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1 bg-white/8" />
        <span className="text-[11px] font-medium text-white/25 tracking-wider uppercase">ou</span>
        <Separator className="flex-1 bg-white/8" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full h-10 gap-2.5 bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/15 transition-all"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? 'Entrando...' : 'Continuar com Google'}
      </Button>
    </div>
  );
}
