import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import {
  infraOccurrenceSchema,
  normalizeNullableText,
  serviceListingPayloadSchema,
} from '@/lib/listagem-servicos/infra-occurrences';
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
  const result = await requireWorkspacePermission(req, 'listagem-servicos.edit', {
    moduleSlug: 'listagem-servicos',
    action: 'edit',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: 'ID inv\u00E1lido.' }, { status: 400 });
  }

  try {
    await ensureServiceListingsTable();

    const body = await req.json();
    const db = getInfraDb();
    const userEmail = result.context.session.user.email ?? result.context.session.user.name ?? 'unknown';

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.finalize) {
      const finalizePermission = await requireWorkspacePermission(req, 'listagem-servicos.finalize', {
        moduleSlug: 'listagem-servicos',
        action: 'finalize',
        requiredRole: 'user',
      });
      if (finalizePermission.response) return finalizePermission.response;

      updateData.status = 'resolvido';
      updateData.technician = body.technician ?? null;
      updateData.solution = body.solution ?? null;
      updateData.resolutionDate = body.resolutionDate ?? null;
      updateData.resolutionNotes = body.resolutionNotes ?? null;
      updateData.resolvedBy = userEmail;
    } else if (body.occurrenceCreated !== undefined && Object.keys(body).length === 1) {
      updateData.occurrenceCreated = body.occurrenceCreated;
    } else {
      const managePermission = await requireWorkspacePermission(req, 'listagem-servicos.manage', {
        moduleSlug: 'listagem-servicos',
        action: 'manage',
        requiredRole: 'user',
      });
      if (managePermission.response) return managePermission.response;

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
        'solicitante',
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
            key === 'fotoUrl' ||
            key === 'solicitante'
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
  const result = await requireWorkspacePermission(req, 'listagem-servicos.delete', {
    moduleSlug: 'listagem-servicos',
    action: 'delete',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

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
