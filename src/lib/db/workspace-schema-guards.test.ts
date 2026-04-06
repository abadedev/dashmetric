import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(new URL('./schema.ts', import.meta.url));
const source = readFileSync(schemaPath, 'utf8');

test('operational tables keep workspaceId columns on the canonical schema', () => {
  const workspaceScopedTables = [
    'technicians',
    'quality_records',
    'support_records',
    'support_call_categories',
    'system_modules',
    'sales_records',
    'cancellation_records',
    'infrastructure_records',
    'sla_targets',
    'sla_config',
    'lotes_importacao',
    'importacoes_brutas',
    'atendimentos',
  ];

  for (const tableName of workspaceScopedTables) {
    assert.match(
      source,
      new RegExp(`pgTable\\(\\s*'${tableName}'.*?workspaceId: uuid\\('workspace_id'\\)`, 's'),
      `expected ${tableName} to declare workspaceId`
    );
  }
});

test('workspace-scoped tables keep the expected workspace indexes and unique constraints', () => {
  assert.match(source, /index\('tech_workspace_id_idx'\)\.on\(table\.workspaceId\)/);
  assert.match(source, /index\('system_module_workspace_id_idx'\)\.on\(table\.workspaceId\)/);
  assert.match(source, /uniqueIndex\('system_module_ws_slug_idx'\)\.on\(table\.workspaceId, table\.slug\)/);
  assert.match(source, /uniqueIndex\('sla_config_ws_key_idx'\)\.on\(table\.workspaceId, table\.key\)/);
  assert.match(source, /uniqueIndex\('atend_ws_hash_idx'\)\.on\(t\.workspaceId, t\.hashImportacao\)/);
});

test('authorization tables keep foreign keys and workspace indexes', () => {
  assert.match(source, /references\(\(\) => workspaces\.id, \{ onDelete: 'cascade' \}\)/);
  assert.match(
    source,
    new RegExp("foreignKey\\(\\{\\s*columns: \\[table\\.groupId, table\\.workspaceId\\],\\s*foreignColumns: \\[accessGroups\\.id, accessGroups\\.workspaceId\\],\\s*name: 'user_groups_group_workspace_fk',")
  );
  assert.match(source, /index\('workspace_member_workspace_idx'\)\.on\(table\.workspaceId\)/);
  assert.match(source, /index\('user_group_workspace_user_idx'\)\.on\(table\.workspaceId, table\.userId\)/);
  assert.match(source, /index\('user_permission_workspace_user_idx'\)\.on\(table\.workspaceId, table\.userId\)/);
});
