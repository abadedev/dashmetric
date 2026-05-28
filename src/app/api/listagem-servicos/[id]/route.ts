import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings, serviceListingLogs } from '@/lib/db/infra-schema';
import {
  infraOccurrenceSchema,
  normalizeCityArea,
  normalizeNullableText,
  serviceListingPayloadSchema,
} from '@/lib/listagem-servicos/infra-occurrences';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';
import { AUDITED_FIELDS, normalizeForCompare, type AuditedField } from '@/lib/listagem-servicos/audit-fields';

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

    const [currentRecord] = await db
      .select()
      .from(serviceListings)
      .where(eq(serviceListings.id, recordId))
      .limit(1);

    if (!currentRecord) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

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
    } else if (
      body.status !== undefined &&
      (
        Object.keys(body).length === 1 ||
        (body.status === 'tecnico_direcionado' && Object.keys(body).length === 2 && 'technician' in body)
      )
    ) {
      const VALID_STATUSES = ['pendente', 'tecnico_direcionado', 'em_andamento', 'em_monitoramento', 'resolvido', 'nao_resolvido'];
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }
      updateData.status = body.status;
      if (body.status === 'tecnico_direcionado' && body.technician) {
        updateData.technician = normalizeNullableText(body.technician);
      }
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
        'classificacao',
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

          if (key === 'cityArea') {
            updateData[key] = normalizeCityArea(parsedData[key] as string | null | undefined);
            continue;
          }

          updateData[key] = parsedData[key];
        }
      }
    }

    if (
      'status' in updateData &&
      currentRecord.status === 'resolvido' &&
      updateData.status !== 'resolvido'
    ) {
      return NextResponse.json(
        { error: 'Chamado já resolvido não pode ser reaberto. Crie um novo registro na listagem.' },
        { status: 400 },
      );
    }

    if ('status' in updateData) {
      if (updateData.status === 'resolvido') {
        if (!currentRecord.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      } else {
        updateData.resolvedAt = null;
      }
    }

    const logEntries: Array<{
      serviceListingId: number;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
      changedBy: string;
    }> = [];
    for (const field of AUDITED_FIELDS) {
      if (!(field in updateData)) continue;
      const before = normalizeForCompare((currentRecord as Record<AuditedField, unknown>)[field]);
      const after = normalizeForCompare(updateData[field]);
      if (before === after) continue;
      logEntries.push({
        serviceListingId: recordId,
        fieldName: field,
        oldValue: before,
        newValue: after,
        changedBy: userEmail,
      });
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(serviceListings)
        .set(updateData)
        .where(eq(serviceListings.id, recordId))
        .returning();
      if (row && logEntries.length > 0) {
        await tx.insert(serviceListingLogs).values(logEntries);
      }
      return row;
    });

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
