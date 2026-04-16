import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuthorizationContext } from './authorization';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/testdb';
process.env.RESEND_API_KEY ??= 're_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret';
process.env.GOOGLE_CLIENT_ID ??= 'google-client';
process.env.GOOGLE_CLIENT_SECRET ??= 'google-secret';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

function makeContext(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    session: {
      session: { id: 'session-1', userId: 'user-1', expiresAt: new Date() },
      user: { id: 'user-1', email: 'user@example.com', name: 'User', role: 'user' },
    } as AuthorizationContext['session'],
    userId: 'user-1',
    globalRole: 'user',
    workspaceSlug: 'dstech',
    workspaceId: 'workspace-1',
    workspaceRole: 'MEMBER',
    effectivePermissions: new Set<string>(),
    moduleAccess: {},
    ...overrides,
  };
}

test('authorization helpers honor explicit permissions', async () => {
  const { hasAllPermissions, hasAnyPermission, hasPermission } = await import('./authorization');
  const context = makeContext({
    effectivePermissions: new Set(['sales.view', 'sales.export']),
    moduleAccess: { sales: 'editor' },
  });

  assert.equal(hasPermission(context, 'sales.view'), true);
  assert.equal(hasAnyPermission(context, ['sales.edit', 'sales.export']), true);
  assert.equal(hasAllPermissions(context, ['sales.view', 'sales.export']), true);
  assert.equal(hasAllPermissions(context, ['sales.view', 'sales.edit']), false);
});

test('authorization keeps workspace admin bypass for global admin permissions only', async () => {
  const { canPerformAction, hasPermission } = await import('./authorization');
  const context = makeContext({
    workspaceRole: 'ADMIN',
    effectivePermissions: new Set(),
  });

  assert.equal(hasPermission(context, 'admin.groups.manage'), true);
  assert.equal(canPerformAction(context, 'sales', 'export'), false);
});

test('authorization grants global admin bypass even without workspace membership', async () => {
  const { canAccessModule, hasPermission } = await import('./authorization');
  const context = makeContext({
    globalRole: 'admin',
    workspaceRole: null,
    effectivePermissions: new Set(),
  });

  assert.equal(hasPermission(context, 'admin.workspaces.manage'), true);
  assert.equal(
    canAccessModule(context, { slug: 'admin', requiredRole: 'admin' }),
    true
  );
});

test('authorization denies non-admin workspace members without granular permission', async () => {
  const { canPerformAction, hasPermission } = await import('./authorization');
  const context = makeContext({
    workspaceRole: 'MEMBER',
    effectivePermissions: new Set(['sales.view']),
  });

  assert.equal(hasPermission(context, 'sales.edit'), false);
  assert.equal(canPerformAction(context, 'sales', 'edit', 'user'), false);
  assert.equal(canPerformAction(context, 'sales', 'view', 'user'), true);
});

test('module access fallback only grants baseline view for regular workspace members', async () => {
  const { canAccessModule } = await import('./authorization');
  const memberContext = makeContext({
    workspaceRole: 'MEMBER',
    effectivePermissions: new Set(),
  });

  assert.equal(
    canAccessModule(memberContext, { slug: 'dashboard', requiredRole: 'user' }),
    true
  );
  assert.equal(
    canAccessModule(memberContext, { slug: 'admin', requiredRole: 'admin' }),
    false
  );
});

test('explicit module access level overrides legacy keys and supports none', async () => {
  const { canPerformAction, hasPermission } = await import('./authorization');
  const context = makeContext({
    effectivePermissions: new Set(['infraestrutura.delete', 'infraestrutura.import']),
    moduleAccess: { infraestrutura: 'none' },
  });

  assert.equal(hasPermission(context, 'infraestrutura.delete'), false);
  assert.equal(canPerformAction(context, 'infraestrutura', 'import', 'user'), false);
});

test('user override can elevate inherited group permission', async () => {
  const { canPerformAction } = await import('./authorization');
  const context = makeContext({
    moduleAccess: { infraestrutura: 'editor' },
  });

  assert.equal(canPerformAction(context, 'infraestrutura', 'export', 'user'), true);
  assert.equal(canPerformAction(context, 'infraestrutura', 'import', 'user'), false);
});
