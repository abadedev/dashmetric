import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/testdb';

import { PgDialect } from 'drizzle-orm/pg-core';

test('buscarHashesExistentes sempre escopa a consulta pelo workspace atual', async () => {
  const { db } = await import('@/lib/db');
  const { buscarHashesExistentes } = await import('./deduplicar-importacao');

  const originalSelect = db.select.bind(db);
  let capturedCondition: unknown;

  (db as unknown as { select: typeof db.select }).select = ((() => ({
    from: () => ({
      where: async (condition: unknown) => {
        capturedCondition = condition;
        return [{ hashImportacao: 'hash-1' }];
      },
    }),
  })) as unknown) as typeof db.select;

  try {
    const result = await buscarHashesExistentes(['hash-1', 'hash-2'], 'workspace-123');
    const query = new PgDialect().sqlToQuery(capturedCondition as Parameters<PgDialect['sqlToQuery']>[0]);

    assert.equal(result.has('hash-1'), true);
    assert.match(query.sql, /"atendimentos"\."workspace_id" = \$1/);
    assert.equal(query.params[0], 'workspace-123');
  } finally {
    (db as unknown as { select: typeof db.select }).select = originalSelect;
  }
});
