const SSL_MODE_ALIAS_PATTERN = /([?&])sslmode=(prefer|require|verify-ca)(?=(&|$))/gi;
const CHANNEL_BINDING_PATTERN = /([?&])channel_binding=[^&]*/gi;

function cleanupQueryDelimiters(value: string) {
  return value
    .replace(/\?&/g, '?')
    .replace(/&&/g, '&')
    .replace(/\?$/g, '')
    .replace(/&$/g, '');
}

export function normalizeConnectionString(value: string | undefined | null) {
  const raw = value?.trim() ?? '';
  if (!raw) return '';

  const normalizedSslMode = raw.replace(SSL_MODE_ALIAS_PATTERN, '$1sslmode=verify-full');
  const withoutChannelBinding = normalizedSslMode.replace(CHANNEL_BINDING_PATTERN, '$1');

  return cleanupQueryDelimiters(withoutChannelBinding);
}
