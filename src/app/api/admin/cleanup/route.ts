import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-auth';
import { db } from '@/lib/db';
import {
  atendimentos,
  qualityRecords,
  supportRecords,
  supportCallCategories,
  salesRecords,
  cancellationRecords,
  infrastructureRecords,
  lotesImportacao,
  importacoesBrutas,
} from '@/lib/db/schemas/workspace';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const body = (await req.json()) as { module?: string };
  const { module } = body;

  try {
    switch (module) {
      case 'atendimentos':
        await db.delete(atendimentos);
        break;
      case 'qualidade':
        await db.delete(qualityRecords);
        break;
      case 'suporte':
        await db.delete(supportCallCategories);
        await db.delete(supportRecords);
        break;
      case 'vendas':
        await db.delete(salesRecords);
        break;
      case 'cancelamentos':
        await db.delete(cancellationRecords);
        break;
      case 'infraestrutura': {
        const infraDb = getInfraDb();
        await infraDb.delete(serviceListings);
        await db.delete(infrastructureRecords);
        break;
      }
      case 'listagem-servicos': {
        const infraDb = getInfraDb();
        await infraDb.delete(serviceListings);
        break;
      }
      case 'lotes':
        await db.delete(importacoesBrutas);
        await db.delete(lotesImportacao);
        break;
      default:
        return NextResponse.json({ error: 'Módulo inválido.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, module });
  } catch (error) {
    console.error('[admin:cleanup:POST]', error);
    return NextResponse.json({ error: 'Erro interno ao limpar dados.' }, { status: 500 });
  }
}
