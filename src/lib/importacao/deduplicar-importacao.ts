import { getAtendimentosCollection } from '@/lib/db/mongo';

/**
 * Retorna o conjunto de hashes que já existem no MongoDB.
 * Feito em chunks para não sobrecarregar a query.
 */
export async function buscarHashesExistentes(hashes: string[]): Promise<Set<string>> {
  if (!hashes.length) return new Set();

  const col = await getAtendimentosCollection();
  const CHUNK = 500;
  const existentes = new Set<string>();

  for (let i = 0; i < hashes.length; i += CHUNK) {
    const slice = hashes.slice(i, i + CHUNK);
    const rows = await col
      .find({ hashImportacao: { $in: slice } }, { projection: { hashImportacao: 1 } })
      .toArray();
    rows.forEach((r) => existentes.add(r.hashImportacao));
  }

  return existentes;
}
