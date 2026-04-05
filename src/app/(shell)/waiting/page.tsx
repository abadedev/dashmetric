'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        document.cookie = 'workspace_access_ok=;path=/;max-age=0';
        router.replace('/');
        return;
      }
      setLastChecked(new Date());
    } catch {
      setLastChecked(new Date());
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    const interval = setInterval(checkAccess, 30_000);
    return () => clearInterval(interval);
  }, [checkAccess]);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #06080d;
          --surface:   #0b0f1a;
          --surface2:  #0e1422;
          --border:    #131c2e;
          --border2:   #1a2640;
          --blue:      #3b82f6;
          --blue-dim:  #1d4ed8;
          --blue-pale: #60a5fa;
          --blue-faint:#0a1929;
          --text-hi:   #dbeafe;
          --text-mid:  #91a4bd;
          --text-lo:   #42648f;
          --text-dim:  #27405f;
          --green:     #22c55e;
          --green-faint:#052e16;
          --green-border:#14532d;
          --amber:     #f59e0b;
          --amber-faint:#1c0a00;
          --amber-border:#78350f;
          --purple:    #a78bfa;
          --purple-faint:#0f0520;
          --purple-border:#3b1f6e;
        }

        .wbody {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text-hi);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          position: relative;
        }

        .wbody::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.022;
          pointer-events: none;
          z-index: 0;
        }

        .wbody::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.35;
          pointer-events: none;
          z-index: 0;
        }

        .wwrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: .3; }
          50%       { transform: scale(1.28); opacity: .05; }
        }
        @keyframes wspin {
          to { transform: rotate(360deg); }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: .15; transform: scale(.7); }
          40%           { opacity: 1;   transform: scale(1); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rise-1 { animation: rise .5s ease both .05s; }
        .rise-2 { animation: rise .5s ease both .15s; }
        .rise-3 { animation: rise .5s ease both .25s; }
        .rise-4 { animation: rise .5s ease both .38s; }
        .rise-5 { animation: rise .5s ease both .50s; }

        .logo-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }

        .icon-wrap {
          position: relative;
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--blue);
          pointer-events: none;
        }
        .ring-1 { inset: -9px;  animation: pulse-ring 2.8s ease-in-out infinite; }
        .ring-2 { inset: -21px; animation: pulse-ring 2.8s ease-in-out infinite .9s; opacity: .6; }

        .icon-circle {
          width: 66px;
          height: 66px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1.5px solid var(--blue-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #e8f4ff;
          letter-spacing: -1px;
          line-height: 1;
          text-align: center;
        }

        .brand-sub {
          font-size: 10px;
          font-weight: 400;
          color: var(--text-dim);
          letter-spacing: 2.8px;
          text-transform: uppercase;
          margin-top: 6px;
          text-align: center;
        }

        .wcard {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
        }

        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 13px;
        }

        .wdots {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .wdot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--blue);
          display: inline-block;
        }
        .wdot:nth-child(1) { animation: dot-pulse 1.5s infinite 0s; }
        .wdot:nth-child(2) { animation: dot-pulse 1.5s infinite .18s; }
        .wdot:nth-child(3) { animation: dot-pulse 1.5s infinite .36s; }

        .status-badge {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--text-lo);
        }

        .status-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-hi);
          margin-bottom: 5px;
        }

        .status-desc {
          font-size: 12.5px;
          color: var(--text-mid);
          line-height: 1.65;
          font-weight: 500;
        }

        .status-last {
          font-size: 11px;
          color: var(--text-lo);
          margin-top: 8px;
          font-weight: 500;
        }

        .card-header {
          padding: 14px 20px 13px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--blue-dim);
        }

        .version-pill {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .8px;
          padding: 2px 8px;
          border-radius: 20px;
          background: var(--blue-faint);
          border: 1px solid var(--text-lo);
          color: var(--blue-dim);
        }

        .card-body {
          padding: 18px 20px;
        }

        .intro-text {
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.72;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .intro-text strong {
          color: var(--blue-pale);
          font-weight: 500;
        }

        .wtimeline {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .timeline-axis {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 24px;
          flex-shrink: 0;
          padding-top: 1px;
        }

        .t-node {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .t-node-blue   { background: var(--blue-faint); color: var(--blue); border: 1px solid var(--text-lo); }
        .t-node-gray   { background: var(--surface2); color: var(--text-mid); border: 1px solid var(--border2); }
        .t-node-green  { background: var(--green-faint); color: var(--green); border: 1px solid var(--green-border); }

        .t-line {
          width: 1px;
          background: var(--border2);
          flex: 1;
          min-height: 18px;
          margin: 4px 0;
        }

        .timeline-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
          padding-top: 2px;
        }

        .t-step-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .7px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .label-blue  { color: var(--blue); }
        .label-gray  { color: var(--text-mid); }
        .label-green { color: var(--green); }

        .t-step-text {
          font-size: 12.5px;
          color: #5c7291;
          line-height: 1.65;
          font-weight: 500;
        }

        .indicators-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--border2);
          margin-bottom: 10px;
        }

        .wpills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 18px;
        }

        .wpill {
          display: inline-flex;
          align-items: center;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: .6px;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
        }
        .pill-green  { color: var(--green);  border-color: var(--green-border);  background: var(--green-faint); }
        .pill-blue   { color: var(--blue-pale); border-color: var(--text-lo);   background: var(--blue-faint); }
        .pill-amber  { color: var(--amber);  border-color: var(--amber-border);  background: var(--amber-faint); }
        .pill-purple { color: var(--purple); border-color: var(--purple-border); background: var(--purple-faint); }

        .dev-card {
          background: #060b14;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wavatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--blue-faint);
          border: 1px solid var(--text-lo);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: var(--blue);
        }

        .dev-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #d4e4f7;
          line-height: 1;
          margin-bottom: 4px;
        }

        .dev-role {
          font-size: 11.5px;
          color: var(--text-lo);
          font-weight: 500;
        }

        .wdivider {
          height: 1px;
          background: var(--border);
          margin: 0 0 14px;
        }

        .btn-primary {
          width: 100%;
          padding: 12px;
          background: rgba(37, 99, 235, .1);
          border: 1px solid #1e3a5f;
          border-radius: 10px;
          color: var(--blue-pale);
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background .2s, border-color .2s;
          letter-spacing: .2px;
        }
        .btn-primary:hover:not(:disabled) {
          background: rgba(59, 130, 246, .18);
          border-color: rgba(96, 165, 250, .5);
        }
        .btn-primary:active:not(:disabled) { transform: scale(.98); }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .btn-ghost {
          background: none;
          border: none;
          color: var(--border2);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px;
          transition: color .2s;
          width: 100%;
          letter-spacing: .2px;
        }
        .btn-ghost:hover { color: var(--text-mid); }

        .wspin { animation: wspin 2.6s linear infinite; }

        .wfooter {
          text-align: center;
          font-size: 10.5px;
          color: var(--text-dim);
          letter-spacing: .6px;
          font-weight: 500;
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />

      <div className="wbody">
        <div className="wwrap">

          {/* Logo */}
          <div className="logo-block rise-1">
            <div className="icon-wrap">
              <div className="wring ring-1" />
              <div className="wring ring-2" />
              <div className="icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                     stroke="#3b82f6" strokeWidth="1.5"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                  <polyline points="9 12 11 14 15 10" stroke="#60a5fa"/>
                </svg>
              </div>
            </div>
            <div>
              <div className="brand-name">Dashmetric</div>
              <div className="brand-sub">KPI · SLA · Analytics</div>
            </div>
          </div>

          {/* Status card */}
          <div className="wcard rise-2">
            <div className="status-header">
              <div className="wdots">
                <span className="wdot" />
                <span className="wdot" />
                <span className="wdot" />
              </div>
              <span className="status-badge">Acesso pendente</span>
            </div>
            <div className="status-title">Aguardando liberação</div>
            <div className="status-desc">
              Seu perfil foi recebido e está em análise. Um administrador irá
              liberar seu acesso em breve — normalmente leva alguns minutos.
            </div>
            {lastChecked && (
              <div className="status-last">
                Última verificação: {lastChecked.toLocaleTimeString('pt-BR')}
              </div>
            )}
          </div>

          {/* About card */}
          <div className="wcard rise-3" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header">
              <span className="section-label">Sobre o projeto</span>
              <span className="version-pill">v 1.0</span>
            </div>

            <div className="card-body">
              <p className="intro-text">
                O <strong>Dashmetric</strong> nasceu de uma necessidade real: o controle de
                SLA da equipe técnica era gerenciado em uma planilha Excel — com abas de
                Dashboard Executivo, Resumo por período, Ranking de Técnicos e Qualidade
                &amp; Reclamações — atualizada manualmente todo mês. Funcional, mas limitada.
              </p>

              <div className="wtimeline">
                <div className="timeline-axis">
                  <div className="t-node t-node-blue">1</div>
                  <div className="t-line" />
                  <div className="t-node t-node-gray">2</div>
                  <div className="t-line" />
                  <div className="t-node t-node-green">3</div>
                </div>
                <div className="timeline-steps">
                  <div>
                    <div className="t-step-label label-blue">Origem</div>
                    <div className="t-step-text">
                      Planilha manual com dados de atendimento técnico de Jan–Mar 2026,
                      consolidando SLA corrido, SLA útil e indicadores por técnico.
                    </div>
                  </div>
                  <div>
                    <div className="t-step-label label-gray">Problema</div>
                    <div className="t-step-text">
                      Sem histórico centralizado, sem visibilidade em tempo real e sem
                      integração entre KPIs operacionais e comerciais.
                    </div>
                  </div>
                  <div>
                    <div className="t-step-label label-green">Solução</div>
                    <div className="t-step-text">
                      Importação via CSV, processamento automático e painel unificado —
                      dados brutos transformados em inteligência operacional.
                    </div>
                  </div>
                </div>
              </div>

              <div className="wdivider" />

              <div className="dev-card">
                <div className="wavatar">RA</div>
                <div>
                  <div className="dev-name">Rafael de Souza Abade Junior</div>
                  <div className="dev-role">Concepção, design e desenvolvimento · 100% autoral</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rise-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-primary" onClick={checkAccess} disabled={checking}>
              <svg className={checking ? 'wspin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {checking ? 'Verificando...' : 'Verificar acesso'}
            </button>
            <button className="btn-ghost" onClick={handleSignOut}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair da conta
            </button>
          </div>

          <div className="wfooter rise-5">© 2025 Dashmetric · Rafael de Souza Abade Junior</div>

        </div>
      </div>
    </>
  );
}
