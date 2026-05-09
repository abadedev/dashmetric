import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListingLogs } from '@/lib/db/infra-schema';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireWorkspacePermission(req, 'listagem-servicos.view', {
    moduleSlug: 'listagem-servicos',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  try {
    await ensureServiceListingsTable();

    const db = getInfraDb();
    const rows = await db
      .select()
      .from(serviceListingLogs)
      .where(eq(serviceListingLogs.serviceListingId, recordId))
      .orderBy(desc(serviceListingLogs.changedAt), desc(serviceListingLogs.id));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[listagem-servicos logs GET]', error);
    return NextResponse.json({ error: 'Erro ao consultar histórico.' }, { status: 500 });
  }
}
