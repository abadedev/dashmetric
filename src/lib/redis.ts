import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var _redisInstance: Redis | null | undefined;
}

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[redis] REDIS_URL not set — cache disabled');
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3_000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('error', (err: Error) => {
    // Silence connection errors — cache is optional
    console.warn('[redis] connection error:', err.message);
  });

  return client;
}

// Singleton — reuse across hot reloads in dev
export const redis: Redis | null =
  globalThis._redisInstance !== undefined
    ? globalThis._redisInstance
    : (globalThis._redisInstance = createRedisClient());
