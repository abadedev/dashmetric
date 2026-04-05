import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(email: string, url: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Seu acesso ao sistema",
    html: `
      <p>Clique no link abaixo para entrar:</p>
      <a href="${url}">${url}</a>
      <p>Se não foi você, ignore.</p>
    `,
  });
}