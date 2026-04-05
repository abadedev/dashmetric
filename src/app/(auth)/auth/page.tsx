import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DstechLogo } from '@/components/brand/dstech-logo';
import { LoginForm } from '@/components/login-form';
import { auth } from '@/lib/auth';
import { resolveActiveWorkspace } from '@/lib/workspace';

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const activeWorkspace = await resolveActiveWorkspace(session.user.id);
    if (activeWorkspace) {
      redirect(`/${activeWorkspace.slug}/dashboard`);
    }
    redirect('/waiting');
  }

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: '#07070c' }}
    >
      {/* Gradient de fundo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Grid sutil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }}
      />

      {/* Blur orb esquerda */}
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: 'rgba(59,130,246,0.06)' }}
      />

      {/* Blur orb direita */}
      <div
        className="pointer-events-none absolute -right-32 bottom-1/3 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: 'rgba(139,92,246,0.05)' }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">

        {/* Card */}
        <div
          className="w-full max-w-[360px] rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 48px -12px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Logo */}
          <div className="mb-8 w-full max-w-[140px] text-white/90">
            <DstechLogo />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[17px] font-semibold text-white">Entrar na plataforma</h1>
            <p className="mt-1 text-[13px] text-white/40">
              Acesso restrito a contas autorizadas.
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-white/20">
          © {new Date().getFullYear()} DSTECH. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
