import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import type { AppRole } from '@/lib/services/module-service';
import {
  infraOccurrenceSchema,
  normalizeNullableText,
  serviceListingPayloadSchema,
} from '@/lib/listagem-servicos/infra-occurrences';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: 'ID inv\u00E1lido.' }, { status: 400 });
  }

  try {
    await ensureServiceListingsTable();

    const db = getInfraDb();
    const [record] = await db.select().from(serviceListings).where(eq(serviceListings.id, recordId)).limit(1);

    if (!record) {
      return NextResponse.json({ error: 'Registro n\u00E3o encontrado.' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('[listagem-servicos GET by id]', error);
    return NextResponse.json({ error: 'Erro ao consultar registro.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  const userRole = ((result.session.user as { role?: AppRole }).role ?? 'user') as AppRole;
  if (userRole === 'user') {
    return NextResponse.json({ error: 'Sem permiss\u00E3o para editar registros.' }, { status: 403 });
  }

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: 'ID inv\u00E1lido.' }, { status: 400 });
  }

  try {
    await ensureServiceListingsTable();

    const body = await req.json();
    const db = getInfraDb();
    const userEmail = result.session.user.email ?? result.session.user.name ?? 'unknown';

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.finalize) {
      updateData.status = 'resolvido';
      updateData.technician = body.technician ?? null;
      updateData.solution = body.solution ?? null;
      updateData.resolutionDate = body.resolutionDate ?? null;
      updateData.resolutionNotes = body.resolutionNotes ?? null;
      updateData.resolvedBy = userEmail;
    } else if (body.occurrenceCreated !== undefined && Object.keys(body).length === 1) {
      updateData.occurrenceCreated = body.occurrenceCreated;
    } else {
      if (userRole !== 'admin') {
        return NextResponse.json({ error: 'Apenas administradores podem editar campos gerais.' }, { status: 403 });
      }

      const parsed = serviceListingPayloadSchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload invalido.' }, { status: 400 });
      }
      const parsedData = parsed.data as Record<string, unknown>;

      const allowed = [
        'referenceDate',
        'priority',
        'technology',
        'cityArea',
        'address',
        'locationUrl',
        'networkBox',
        'problem',
        'tipoOcorrencia',
        'observacaoInfra',
        'status',
        'occurrenceCreated',
        'technician',
        'solution',
        'resolutionDate',
        'resolutionNotes',
        'fotoUrl',
      ];

      for (const key of allowed) {
        if (key in parsedData) {
          if (key === 'tipoOcorrencia' && parsed.data.tipoOcorrencia) {
            updateData.tipoOcorrencia = infraOccurrenceSchema.parse(parsed.data.tipoOcorrencia);
            continue;
          }

          if (
            key === 'priority' ||
            key === 'technology' ||
            key === 'cityArea' ||
            key === 'address' ||
            key === 'locationUrl' ||
            key === 'networkBox' ||
            key === 'problem' ||
            key === 'observacaoInfra' ||
            key === 'technician' ||
            key === 'solution' ||
            key === 'resolutionDate' ||
            key === 'resolutionNotes' ||
            key === 'fotoUrl'
          ) {
            updateData[key] = normalizeNullableText(parsedData[key] as string | null | undefined);
            continue;
          }

          updateData[key] = parsedData[key];
        }
      }
    }

    const [updated] = await db
      .update(serviceListings)
      .set(updateData)
      .where(eq(serviceListings.id, recordId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Registro n\u00E3o encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[listagem-servicos PATCH]', error);
    return NextResponse.json({ error: 'Erro ao atualizar registro.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(req);
  if (result.response) return result.response;

  const userRole = ((result.session.user as { role?: AppRole }).role ?? 'user') as AppRole;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem excluir registros.' }, { status: 403 });
  }

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: 'ID inv\u00E1lido.' }, { status: 400 });
  }

  try {
    await ensureServiceListingsTable();

    const db = getInfraDb();
    const [deleted] = await db
      .delete(serviceListings)
      .where(eq(serviceListings.id, recordId))
      .returning({ id: serviceListings.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Registro n\u00E3o encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[listagem-servicos DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir registro.' }, { status: 500 });
  }
}
