import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

import { db, globalDb } from '@/lib/db';
import { atendimentos, moduleImportProfiles, systemModules } from '@/lib/db/schema';
import { workspaces, workspaceMembers } from '@/lib/db/schemas/global';
import { createGroup, deleteGroup, listGroups } from '@/lib/services/permission-service';
import { getSalesOverview } from '@/lib/services/sales-service';
import { getSupportTypeSummary } from '@/lib/services/support-summary-service';
import { insertAttendanceChunk } from '@/lib/importacao/importar-atendimentos';
import { ensureDefaultModules, listSidebarModules } from '@/lib/services/module-service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function getActiveWorkspace() {
  const [workspace] = await globalDb
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.isActive, true))
    .limit(1);

  if (!workspace) {
    throw new Error('No active workspace available for integration tests');
  }

  return workspace;
}

test('real db: insertAttendanceChunk respects workspace-scoped deduplication', { skip: !hasDatabase }, async () => {
  const workspace = await getActiveWorkspace();
  const hash = `integration-hash-${randomUUID()}`;

  try {
    const firstInsert = await insertAttendanceChunk(
      [{ idx: 1, dados: { tipo: 'integration-test', hashImportacao: hash } }],
      workspace.id,
      new Date(),
    );

    const duplicateInsert = await insertAttendanceChunk(
      [{ idx: 2, dados: { tipo: 'integration-test', hashImportacao: hash } }],
      workspace.id,
      new Date(),
    );

    assert.equal(firstInsert.inserted, 1);
    assert.equal(firstInsert.duplicated, 0);
    assert.equal(duplicateInsert.inserted, 0);
    assert.equal(duplicateInsert.duplicated, 1);
  } finally {
    await db
      .delete(atendimentos)
      .where(and(eq(atendimentos.workspaceId, workspace.id), eq(atendimentos.hashImportacao, hash)));
  }
});

test('real db: analytics services return empty payloads for an isolated workspace id', { skip: !hasDatabase }, async () => {
  const isolatedWorkspaceId = randomUUID();

  const sales = await getSalesOverview({ workspaceId: isolatedWorkspaceId });
  const support = await getSupportTypeSummary({ workspaceId: isolatedWorkspaceId });

  assert.equal(sales.totals.negotiatedClients, 0);
  assert.equal(sales.totals.closedClients, 0);
  assert.deepEqual(sales.byCity, []);
  assert.equal(support.total, 0);
  assert.deepEqual(support.summary, []);
  assert.deepEqual(support.triageByAttendant, []);
});

test('real db: admin group service does not leak groups across workspaces', { skip: !hasDatabase }, async () => {
  const workspace = await getActiveWorkspace();
  const isolatedWorkspaceId = randomUUID();
  const groupName = `integration-group-${randomUUID()}`;

  const created = await createGroup(workspace.id, groupName, 'Temporary integration test group');

  try {
    const scopedGroups = await listGroups(workspace.id);
    const isolatedGroups = await listGroups(isolatedWorkspaceId);

    assert.equal(scopedGroups.some((group) => group.id === created.id), true);
    assert.equal(isolatedGroups.some((group) => group.id === created.id), false);
  } finally {
    await deleteGroup(workspace.id, created.id);
  }
});

test('real db: new workspace starts with only dashboard and upload enabled, and manual enable still works', { skip: !hasDatabase }, async () => {
  const slug = `integration-${randomUUID().slice(0, 8)}`;
  const [workspace] = await globalDb
    .insert(workspaces)
    .values({
      name: `Integration ${slug}`,
      slug,
      createdBy: 'integration-test',
      defaultTheme: 'dark',
    })
    .returning({ id: workspaces.id });

  try {
    await ensureDefaultModules(workspace.id);

    const modules = await db
      .select({
        id: systemModules.id,
        slug: systemModules.slug,
        isActive: systemModules.isActive,
        showInSidebar: systemModules.showInSidebar,
      })
      .from(systemModules)
      .where(eq(systemModules.workspaceId, workspace.id));

    const enabledSlugs = modules
      .filter((module) => module.isActive && module.showInSidebar)
      .map((module) => module.slug)
      .sort();

    assert.deepEqual(enabledSlugs, ['dashboard', 'upload']);

    await db
      .update(systemModules)
      .set({ isActive: true, showInSidebar: true, updatedAt: new Date() })
      .where(and(eq(systemModules.workspaceId, workspace.id), eq(systemModules.slug, 'vendas')));

    const sidebarModules = await listSidebarModules('admin', workspace.id);
    assert.equal(sidebarModules.some((module) => module.slug === 'vendas'), true);
  } finally {
    const workspaceModules = await db
      .select({ id: systemModules.id })
      .from(systemModules)
      .where(eq(systemModules.workspaceId, workspace.id));

    if (workspaceModules.length > 0) {
      await db
        .delete(moduleImportProfiles)
        .where(inArray(moduleImportProfiles.moduleId, workspaceModules.map((module) => module.id)));
    }

    await db.delete(systemModules).where(eq(systemModules.workspaceId, workspace.id));
    await globalDb.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    await globalDb.delete(workspaces).where(eq(workspaces.id, workspace.id));
  }
});
