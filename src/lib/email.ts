import { Resend } from 'resend';
import { getRequiredEnv } from '@/lib/env';

function getResendClient() {
  return new Resend(getRequiredEnv('RESEND_API_KEY'));
}

export async function sendMagicLink(email: string, url: string) {
  try {
    const fromDomain = process.env.EMAIL_FROM || 'Acme <onboarding@resend.dev>';
    
    // Validate if fallback Resend.Dev is used, it only works with verified emails
    const { data, error } = await getResendClient().emails.send({
      from: fromDomain,
      to: email,
      subject: 'Seu acesso seguro ao sistema',
      html: `
        <h2>Login - Acesso Simplificado</h2>
        <p>Você solicitou um link para entrar.</p>
        <div style="margin: 24px 0;">
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Acessar Sistema
          </a>
        </div>
        <p>Ou copie a URL abaixo e cole no seu navegador:</p>
        <p style="word-break: break-all; color: #666;"><a href="${url}">${url}</a></p>
        <p><small>Se você não solicitou este acesso, ignore este email com segurança.</small></p>
      `,
    });

    if (error) {
      console.error('[Resend Error] Resposta de Falha:', error);
      throw new Error(`Resend falhou: ${error.message} - Verifique se 'EMAIL_FROM' tem o domínio validado lá.`);
    }

    console.log('[Magic Link] Email despachado com sucesso via Resend p/', email);
    return data;
  } catch (err) {
    console.error('[Magic Link] Exceção crítica ao tentar despachar:', err);
    throw err;
  }
}
