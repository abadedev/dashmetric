import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { FALLBACK_CLIENTES_ATIVOS, getClientesAtivos } from '@/lib/utils/clientes-ativos';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const total = await getClientesAtivos();
  const source = total === FALLBACK_CLIENTES_ATIVOS ? 'fallback' : 'intranet';

  return NextResponse.json({ total, source });
}
