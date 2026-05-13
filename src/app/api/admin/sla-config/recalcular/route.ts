import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getInfraDb } from '@/lib/db/infra';
import { infraSlaConfig } from '@/lib/db/schema';
import { serviceListings } from '@/lib/db/infra-schema';
import { requireAuth } from '@/lib/require-auth';
import { buildAuthorizationContext } from '@/lib/authorization';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';
import { evaluateSla, parsePriority, type SlaMeta } from '@/lib/listagem-servicos/sla';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const workspaceSlug = req.cookies.get('dwm_active_workspace')?.value ?? 'dstech';
  const ctx = await buildAuthorizationContext(req.headers, workspaceSlug);
  const isAdmin = ctx?.globalRole === 'admin' || ctx?.workspaceRole === 'ADMIN';
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await ensureServiceListingsTable();

    const metas: SlaMeta[] = (
      await db.select().from(infraSlaConfig).orderBy(asc(infraSlaConfig.prioridade))
    ).map((m) => ({ prioridade: m.prioridade, label: m.label, metaHoras: m.metaHoras }));

    const infraDb = getInfraDb();
    const rows = await infraDb
      .select({
        id: serviceListings.id,
        priority: serviceListings.priority,
        referenceDate: serviceListings.referenceDate,
        createdAt: serviceListings.createdAt,
        resolvedAt: serviceListings.resolvedAt,
        slaStatus: serviceListings.slaStatus,
      })
      .from(serviceListings);

    const now = new Date();
    let atualizados = 0;

    for (const row of rows) {
      const prioridade = parsePriority(row.priority);
      const openedAt =
        row.createdAt instanceof Date
          ? row.createdAt
          : row.referenceDate
            ? new Date(`${row.referenceDate}T00:00:00Z`)
            : null;
      if (!openedAt) continue;

      const { status } = evaluateSla({
        openedAt,
        resolvedAt: row.resolvedAt ?? null,
        prioridade,
        metas,
        now,
      });

      if (status !== row.slaStatus) {
        await infraDb
          .update(serviceListings)
          .set({ slaStatus: status })
          .where(eq(serviceListings.id, row.id));
        atualizados++;
      }
    }

    return NextResponse.json({ atualizados, total: rows.length });
  } catch (err) {
    console.error('[sla-config/recalcular]', err);
    return NextResponse.json({ error: 'Erro ao recalcular SLA.' }, { status: 500 });
  }
}
