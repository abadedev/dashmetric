import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { globalDb as db } from '@/lib/db';
import { workspaces, workspaceMembers } from '@/lib/db/schemas/global';
import { requireAuth } from '@/lib/require-auth';
import {
  saveWorkspaceLogoVariant,
  deleteWorkspaceLogoVariant,
  saveWorkspaceLogo,
  deleteWorkspaceLogo,
  type LogoVariant,
} from '@/lib/server/workspace-logo';
import { validateLogo } from '@/lib/workspace-logo-rules';

interface Context {
  params: Promise<{ workspaceId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseVariant(req: NextRequest): LogoVariant | null {
  const v = req.nextUrl.searchParams.get('variant');
  if (v === 'dark' || v === 'light') return v;
  return null;
}

/** Verify auth + workspace-admin (or global-admin) permission. */
async function authorize(req: NextRequest, workspaceId: string) {
  const { session, response } = await requireAuth(req);
  if (response) return { session: null, error: response };

  const isGlobalAdmin = (session.user as { role?: string }).role === 'admin';
  if (!isGlobalAdmin) {
    const [membership] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);

    if (membership?.role !== 'ADMIN') {
      return {
        session: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
  }

  return { session, error: null };
}

export async function POST(req: NextRequest, { params }: Context) {
  const { workspaceId } = await params;

  if (!UUID_RE.test(workspaceId)) {
    return NextResponse.json({ error: 'Workspace inválido' }, { status: 400 });
  }

  const { error } = await authorize(req, workspaceId);
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const file = formData.get('logo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado (campo: logo)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateLogo(buffer);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.message }, { status: 422 });
  }

  const variant = parseVariant(req);

  let logoUrl: string;
  try {
    if (variant) {
      logoUrl = await saveWorkspaceLogoVariant(workspaceId, buffer, validation.mimeType, variant);
    } else {
      logoUrl = await saveWorkspaceLogo(workspaceId, buffer, validation.mimeType);
    }
  } catch (err) {
    console.error('[logo:save] workspaceId=%s variant=%s error=%o', workspaceId, variant, err);
    return NextResponse.json({ error: 'Erro ao salvar arquivo no disco.' }, { status: 500 });
  }

  console.info('[logo:save] workspaceId=%s variant=%s url=%s', workspaceId, variant ?? 'default', logoUrl);

  const dbField = variant === 'dark'
    ? { logoDarkUrl: logoUrl, updatedAt: new Date() }
    : variant === 'light'
      ? { logoLightUrl: logoUrl, updatedAt: new Date() }
      : { logoUrl, updatedAt: new Date() };

  await db.update(workspaces).set(dbField).where(eq(workspaces.id, workspaceId));

  return NextResponse.json({ data: { logoUrl, variant: variant ?? 'default' } });
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const { workspaceId } = await params;

  if (!UUID_RE.test(workspaceId)) {
    return NextResponse.json({ error: 'Workspace inválido' }, { status: 400 });
  }

  const { error } = await authorize(req, workspaceId);
  if (error) return error;

  const variant = parseVariant(req);

  if (variant) {
    await deleteWorkspaceLogoVariant(workspaceId, variant);
    const dbField = variant === 'dark'
      ? { logoDarkUrl: null, updatedAt: new Date() }
      : { logoLightUrl: null, updatedAt: new Date() };
    await db.update(workspaces).set(dbField).where(eq(workspaces.id, workspaceId));
    return NextResponse.json({ data: { logoUrl: null, variant } });
  }

  await deleteWorkspaceLogo(workspaceId);
  await db.update(workspaces).set({ logoUrl: null, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
  return NextResponse.json({ data: { logoUrl: null, variant: 'default' } });
}
