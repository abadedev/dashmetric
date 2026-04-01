import crypto from 'crypto';
import { NextRequest } from 'next/server';

export class ExternalApiAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
  }
}

function getConfiguredToken() {
  return process.env.EXTERNAL_API_TOKEN?.trim() ?? '';
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function extractBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ExternalApiAuthError(
      'Authorization header must use the Bearer TOKEN format.',
      401,
      'invalid_authorization_header'
    );
  }

  return token.trim();
}

export function requireExternalApiAuth(req: NextRequest) {
  const configuredToken = getConfiguredToken();

  if (!configuredToken) {
    throw new ExternalApiAuthError(
      'External API token is not configured on the server.',
      503,
      'external_api_token_not_configured'
    );
  }

  const token = extractBearerToken(req);

  if (!safeEqual(token, configuredToken)) {
    throw new ExternalApiAuthError(
      'Invalid external API token.',
      401,
      'invalid_token'
    );
  }

  return true;
}
