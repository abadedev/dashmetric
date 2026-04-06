import { Resend } from 'resend';
import { getRequiredEnv } from '@/lib/env';

export const resend = new Resend(getRequiredEnv('RESEND_API_KEY'));

export async function sendMagicLink(email: string, url: string) {
  await resend.emails.send({
    from: getRequiredEnv('EMAIL_FROM'),
    to: email,
    subject: 'Seu acesso ao sistema',
    html: `
      <p>Clique no link abaixo para entrar:</p>
      <a href="${url}">${url}</a>
      <p>Se não foi você, ignore.</p>
    `,
  });
}
