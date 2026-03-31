import { NextRequest, NextResponse } from 'next/server';
import { processImportBatch } from '@/lib/services/import-service';
import { db } from '@/lib/db';
import { importBatches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const importType = (formData.get('type') as string) || 'atendimentos';

    if (!file || !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Arquivo CSV obrigatório' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 50MB)' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const result = await processImportBatch(text, importType, file.name);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const batches = await db
    .select()
    .from(importBatches)
    .orderBy(importBatches.createdAt);
  return NextResponse.json(batches);
}
