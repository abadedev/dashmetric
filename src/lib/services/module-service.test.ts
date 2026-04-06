import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/testdb';

test('new workspace bootstrap enables only dashboard and upload by default', async () => {
  const { getDefaultModuleActivationState } = await import('./module-service');

  assert.deepEqual(
    getDefaultModuleActivationState(
      { slug: 'dashboard', isActive: true, showInSidebar: true },
      { isNewWorkspaceBootstrap: true }
    ),
    { isActive: true, showInSidebar: true }
  );

  assert.deepEqual(
    getDefaultModuleActivationState(
      { slug: 'upload', isActive: true, showInSidebar: true },
      { isNewWorkspaceBootstrap: true }
    ),
    { isActive: true, showInSidebar: true }
  );

  assert.deepEqual(
    getDefaultModuleActivationState(
      { slug: 'vendas', isActive: true, showInSidebar: true },
      { isNewWorkspaceBootstrap: true }
    ),
    { isActive: false, showInSidebar: false }
  );
});

test('existing workspaces keep the module catalog defaults', async () => {
  const { getDefaultModuleActivationState } = await import('./module-service');

  assert.deepEqual(
    getDefaultModuleActivationState(
      { slug: 'vendas', isActive: true, showInSidebar: true },
      { isNewWorkspaceBootstrap: false }
    ),
    { isActive: true, showInSidebar: true }
  );
});
