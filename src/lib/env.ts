const missingEnv = new Set<string>();

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    missingEnv.add(name);
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }

  return value;
}

export function listMissingRequiredEnv() {
  return Array.from(missingEnv);
}
