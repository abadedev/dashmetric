import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getSupportTypeSummary } from '@/lib/services/support-summary-service';
import { getClientesAtivos } from '@/lib/utils/clientes-ativos';

export const runtime = 'nodejs';

function parseDateParam(value: string, mode: 'start' | 'end') {
  const trimmed = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const candidate = dateOnly
    ? new Date(`${trimmed}T${mode === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`)
    : new Date(trimmed);

  if (Number.isNaN(candidate.getTime())) {
    throw new Error(`Invalid ${mode} date.`);
  }

  return candidate;
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'suporte.view', {
    moduleSlug: 'suporte',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? parseDateParam(fromStr, 'start') : null;
    const to = toStr ? parseDateParam(toStr, 'end') : null;

    const data = await getSupportTypeSummary({ from, to, workspaceId: result.context.workspaceId });

    const baseAtiva = await getClientesAtivos();
    const totalSupporte = data.total;
    const inr =
      baseAtiva > 0 ? Math.round((totalSupporte / baseAtiva) * 100 * 100) / 100 : 0;

    return NextResponse.json({
      data: data.summary,
      total: data.total,
      triageByAttendant: data.triageByAttendant,
      inr,
      baseAtiva,
      totalSupporte,
    });
  } catch (err) {
    console.error('[support-records]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
