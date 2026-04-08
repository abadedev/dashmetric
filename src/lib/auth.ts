import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { globalDb } from '@/lib/db';
import { user, session, account, verification } from '@/lib/db/schemas/global';
import { sendMagicLink } from '@/lib/email';
import { getRequiredEnv } from '@/lib/env';

export const getBaseUrl = () => {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

const appUrl = getBaseUrl();
const appOrigin = new URL(appUrl).origin;
const appHost = new URL(appUrl).host;
const appProtocol = new URL(appUrl).protocol === 'https:' ? 'https' : 'http';

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [appHost, 'localhost:3000', '127.0.0.1:3000'],
    fallback: appUrl,
    protocol: appProtocol,
  },
  secret: getRequiredEnv('BETTER_AUTH_SECRET'),
  trustedOrigins: async (request) => {
    const forwardedHost = request?.headers.get('x-forwarded-host');
    const host = request?.headers.get('host');
    const forwardedProto = request?.headers.get('x-forwarded-proto');
    const origin = request?.headers.get('origin');
    const protocol = forwardedProto === 'https' ? 'https' : appProtocol;
    const requestOrigin = (forwardedHost ?? host) ? `${protocol}://${forwardedHost ?? host}` : null;

    return [appOrigin, origin, requestOrigin].filter(
      (value): value is string => Boolean(value)
    );
  },
  advanced: {
    trustedProxyHeaders: true,
    useSecureCookies: appUrl.startsWith('https'),
  },
  database: drizzleAdapter(globalDb, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
      clientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        required: false,
        input: false,
      },
    },
  },
});
