import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

/**
 * Retorna o conjunto de hashes que já existem no PostgreSQL.
 * Feito em chunks para não exceder o limite de parâmetros da query.
 */
export async function buscarHashesExistentes(hashes: string[]): Promise<Set<string>> {
  if (!hashes.length) return new Set();

  const CHUNK = 500;
  const existentes = new Set<string>();

  for (let i = 0; i < hashes.length; i += CHUNK) {
    const slice = hashes.slice(i, i + CHUNK);
    const rows = await db
      .select({ hashImportacao: atendimentos.hashImportacao })
      .from(atendimentos)
      .where(inArray(atendimentos.hashImportacao, slice));
    rows.forEach((r) => existentes.add(r.hashImportacao));
  }

  return existentes;
}
