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
    <main className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full blur-[120px]"
        style={{ background: 'rgba(59, 130, 246, 0.10)', animationDuration: '4s' }}
      />

      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 animate-pulse rounded-full blur-[100px]"
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-12 w-full max-w-[220px] text-white">
          <DstechLogo />
        </div>

        <div
          className="w-full max-w-sm rounded-2xl p-8 backdrop-blur-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-xl font-medium text-white">Bem-vindo de volta</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Dashmetric
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-12 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} DSTECH. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
