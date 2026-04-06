import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('attendance schema keeps workspace-scoped unique index for deduplication', () => {
  const schemaPath = fileURLToPath(new URL('./schema.ts', import.meta.url));
  const source = readFileSync(schemaPath, 'utf8');

  assert.match(
    source,
    /uniqueIndex\('atend_ws_hash_idx'\)\.on\(t\.workspaceId, t\.hashImportacao\)/
  );
});
