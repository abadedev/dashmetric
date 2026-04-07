import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.14) 0%, transparent 60%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }}
      />

      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: 'rgba(59,130,246,0.06)' }}
      />

      <div
        className="pointer-events-none absolute -right-32 bottom-1/3 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: 'rgba(59,130,246,0.08)' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div
          className="w-full max-w-[380px] rounded-[28px] p-8"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(7,10,18,0.94) 100%)',
            border: '1px solid rgba(148,163,184,0.14)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 60px -18px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.png"
              alt="Dashmetric"
              width={280}
              height={80}
              priority
              className="h-auto w-auto max-w-[280px]"
            />
          </div>

          <div className="mb-7">
            <h1 className="text-[17px] font-semibold text-white">Entrar na plataforma</h1>
            <p className="mt-1 text-[13px] text-white/40">
              Acesse o Dashmetric com sua conta autorizada.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-8 text-center text-[11px] text-white/25">
          © {new Date().getFullYear()} Dashmetric. Rafael S Abade Jr.
        </p>
      </div>
    </main>
  );
}
