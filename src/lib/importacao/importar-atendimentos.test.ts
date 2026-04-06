import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/testdb';
process.env.RESEND_API_KEY ??= 're_test';
process.env.EMAIL_FROM ??= 'noreply@example.com';
process.env.BETTER_AUTH_SECRET ??= 'test-secret';
process.env.GOOGLE_CLIENT_ID ??= 'google-client';
process.env.GOOGLE_CLIENT_SECRET ??= 'google-secret';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

test('insertAttendanceChunk preserves import flow when duplicate rows hit the unique index', async () => {
  const { insertAttendanceChunk } = await import('./importar-atendimentos');

  const result = await insertAttendanceChunk(
    [
      { idx: 10, dados: { hashImportacao: 'hash-1' } },
      { idx: 11, dados: { hashImportacao: 'hash-2' } },
    ],
    'workspace-1',
    new Date('2026-04-05T00:00:00.000Z'),
    {
      insertMany: async () => [{ id: 1 }],
    },
  );

  assert.equal(result.inserted, 1);
  assert.equal(result.duplicated, 1);
  assert.equal(result.errored, 0);
  assert.deepEqual(result.errors, []);
});

test('insertAttendanceChunk falls back to row-by-row mode when batch insert fails', async () => {
  const { insertAttendanceChunk } = await import('./importar-atendimentos');

  const perRowResponses = new Map([
    ['hash-1', [{ id: 1 }]],
    ['hash-2', []],
  ]);

  const result = await insertAttendanceChunk(
    [
      { idx: 20, dados: { hashImportacao: 'hash-1' } },
      { idx: 21, dados: { hashImportacao: 'hash-2' } },
      { idx: 22, dados: { hashImportacao: 'hash-3' } },
    ],
    'workspace-1',
    new Date('2026-04-05T00:00:00.000Z'),
    {
      insertMany: async () => {
        throw new Error('duplicate key value violates unique constraint');
      },
      insertOne: async (value) => {
        if (value.hashImportacao === 'hash-3') {
          throw new Error('invalid data');
        }
        return perRowResponses.get(String(value.hashImportacao)) ?? [];
      },
    },
  );

  assert.equal(result.inserted, 1);
  assert.equal(result.duplicated, 1);
  assert.equal(result.errored, 1);
  assert.deepEqual(result.errors, [
    { linha: 22, erro: 'PostgreSQL Error: invalid data' },
  ]);
});
