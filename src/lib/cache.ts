import { redis } from './redis';

const DEFAULT_TTL = 30; // seconds

/**
 * Builds a deterministic cache key from a resource name and a params map.
 * Null/undefined/empty params are excluded. Keys are sorted alphabetically.
 *
 * Example: buildCacheKey('summary', { endDate: '2025-03-31', startDate: '2025-01-01' })
 *   → 'external:summary:endDate=2025-03-31&startDate=2025-01-01'
 */
export function buildCacheKey(
  resource: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);

  const qs = parts.length > 0 ? `:${parts.join('&')}` : '';
  return `external:${resource}${qs}`;
}

/**
 * Wraps a fetcher with a Redis cache layer.
 *
 * - HIT  → returns { data, source: 'cache' }
 * - MISS → runs fetcher, stores result, returns { data, source: 'database' }
 * - Redis error → silently falls through to fetcher, returns { data, source: 'database' }
 *
 * The cache NEVER blocks or crashes the API.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<{ data: T; source: 'cache' | 'database' }> {
  // Cache disabled (no Redis client)
  if (!redis) {
    return { data: await fetcher(), source: 'database' };
  }

  // Try cache hit
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return { data: JSON.parse(cached) as T, source: 'cache' };
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  // Cache miss: run fetcher
  const data = await fetcher();

  // Store in cache (fire-and-forget — never await errors)
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch {
    // Ignore write errors
  }

  return { data, source: 'database' };
}
