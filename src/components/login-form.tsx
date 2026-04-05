'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch {
      toast.error('Erro ao autenticar com Google.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        style={{
          background: hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#fff',
        }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {loading ? 'Entrando...' : 'Continuar com Google'}
      </button>

      <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
        Acesso restrito a contas autorizadas no Dashmetric.
      </p>
    </div>
  );
}
