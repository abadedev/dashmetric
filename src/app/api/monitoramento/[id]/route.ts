import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getInfraDb } from '@/lib/db/infra';
import { monitoramentoItems } from '@/lib/db/infra-schema';
import { ensureMonitoramentoTable } from '@/lib/monitoramento/ensure-monitoramento-table';
import {
  CONCLUDED_STATUS,
  STATUS_OPTIONS,
  monitoramentoPayloadSchema,
  normalizeMultilineText,
  normalizeNullableText,
} from '@/lib/monitoramento/constants';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(STATUS_OPTIONS.map((item) => item.value));

function parseRecordId(id: string) {
  const recordId = parseInt(id, 10);
  return Number.isNaN(recordId) ? null : recordId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewPermission = await requireWorkspacePermission(req, 'monitoramento.view', {
    moduleSlug: 'monitoramento',
    action: 'view',
    requiredRole: 'user',
  });
  if (viewPermission.response) return viewPermission.response;

  const { id } = await params;
  const recordId = parseRecordId(id);
  if (recordId === null) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  try {
    await ensureMonitoramentoTable();

    const body = await req.json();
    const db = getInfraDb();
    const userEmail = viewPermission.context.session.user.email ?? viewPermission.context.session.user.name ?? 'unknown';

    const [currentRecord] = await db
      .select()
      .from(monitoramentoItems)
      .where(and(eq(monitoramentoItems.id, recordId), eq(monitoramentoItems.workspaceId, viewPermission.context.workspaceId)))
      .limit(1);

    if (!currentRecord) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status !== undefined && Object.keys(body).length === 1) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }

      updateData.status = body.status;
      if (body.status === CONCLUDED_STATUS) {
        updateData.resolvidoAt = new Date();
        updateData.resolvidoPor = userEmail;
      } else if (currentRecord.status === CONCLUDED_STATUS) {
        updateData.resolvidoAt = null;
        updateData.resolvidoPor = null;
      }
    } else {
      const managePermission = await requireWorkspacePermission(req, 'monitoramento.manage', {
        moduleSlug: 'monitoramento',
        action: 'manage',
        requiredRole: 'user',
      });
      if (managePermission.response) return managePermission.response;

      const parsed = monitoramentoPayloadSchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload inválido.' }, { status: 400 });
      }

      const parsedData = parsed.data as Record<string, unknown>;
      const allowed = [
        'dataPostagem',
        'areaCity',
        'cliente',
        'login',
        'rede',
        'serialMac',
        'problema',
        'qtdDesconexao',
        'observacoes',
        'solucao',
        'dataSolucao',
        'atendAberto',
        'sensor',
        'status',
      ];

      for (const key of allowed) {
        if (!(key in parsedData)) continue;

        if (
          key === 'areaCity' ||
          key === 'cliente' ||
          key === 'login' ||
          key === 'rede' ||
          key === 'serialMac' ||
          key === 'dataSolucao'
        ) {
          updateData[key] = normalizeNullableText(parsedData[key] as string | null | undefined);
          continue;
        }

        if (key === 'observacoes' || key === 'solucao') {
          updateData[key] = normalizeMultilineText(parsedData[key] as string | null | undefined);
          continue;
        }

        updateData[key] = parsedData[key];
      }

      if ('status' in updateData) {
        if (updateData.status === CONCLUDED_STATUS) {
          updateData.resolvidoAt = currentRecord.resolvidoAt ?? new Date();
          updateData.resolvidoPor = currentRecord.resolvidoPor ?? userEmail;
        } else if (currentRecord.status === CONCLUDED_STATUS) {
          updateData.resolvidoAt = null;
          updateData.resolvidoPor = null;
        }
      }
    }

    const [updated] = await db
      .update(monitoramentoItems)
      .set(updateData)
      .where(and(eq(monitoramentoItems.id, recordId), eq(monitoramentoItems.workspaceId, viewPermission.context.workspaceId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[monitoramento PATCH]', error);
    return NextResponse.json({ error: 'Erro ao atualizar registro.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireWorkspacePermission(req, 'monitoramento.manage', {
    moduleSlug: 'monitoramento',
    action: 'manage',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  const { id } = await params;
  const recordId = parseRecordId(id);
  if (recordId === null) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  try {
    await ensureMonitoramentoTable();

    const db = getInfraDb();
    const [deleted] = await db
      .delete(monitoramentoItems)
      .where(and(eq(monitoramentoItems.id, recordId), eq(monitoramentoItems.workspaceId, result.context.workspaceId)))
      .returning({ id: monitoramentoItems.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[monitoramento DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir registro.' }, { status: 500 });
  }
}
