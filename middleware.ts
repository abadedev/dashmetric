// Re-exports the proxy function as the Next.js middleware entry point.
// The proxy logic lives in src/proxy.ts so it can be tested/imported independently.
// Node.js runtime is required because the proxy uses drizzle-orm with node-postgres.
export { proxy as middleware, config } from '@/proxy';
export const runtime = 'nodejs';
