import Image from 'next/image';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Radial gradient top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating orb — blue */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-pulse pointer-events-none"
        style={{ background: 'rgba(59, 130, 246, 0.10)', animationDuration: '4s' }}
      />
      {/* Floating orb — purple */}
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-pulse pointer-events-none"
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-12">
          <Image
            src="/logo.png"
            alt="DSTECH"
            width={200}
            height={50}
            className="h-auto w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-2xl p-8 backdrop-blur-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-xl font-medium text-white mb-2">Bem-vindo de volta</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              NOC Performance Manager
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-xs mt-12" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} DSTECH. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
