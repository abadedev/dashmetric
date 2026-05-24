import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { infraSlaConfig } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { buildAuthorizationContext } from '@/lib/authorization';

export const runtime = 'nodejs';

async function ensureEmergencialSeed() {
  await db.execute(sql`
    INSERT INTO infra_sla_config (prioridade, label, meta_horas)
    VALUES (0, 'Emergencial', 6)
    ON CONFLICT (prioridade) DO NOTHING
  `);
}

async function requireSlaAdmin(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return { response: auth.response, session: null as never };
  const workspaceSlug = req.cookies.get('dwm_active_workspace')?.value ?? 'dstech';
  const ctx = await buildAuthorizationContext(req.headers, workspaceSlug);
  const isAdmin = ctx?.globalRole === 'admin' || ctx?.workspaceRole === 'ADMIN';
  if (!isAdmin) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null as never,
    };
  }
  return { response: null, session: auth.session };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;
  try {
    await ensureEmergencialSeed();
    const rows = await db.select().from(infraSlaConfig).orderBy(asc(infraSlaConfig.prioridade));
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[sla-config/GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar configuração.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireSlaAdmin(req);
  if (guard.response) return guard.response;

  try {
    const body = await req.json();
    const prioridade = Number(body?.prioridade);
    const metaHoras = Number(body?.metaHoras);

    if (![0, 1, 2, 3].includes(prioridade)) {
      return NextResponse.json({ error: 'prioridade inválida (use 0, 1, 2 ou 3).' }, { status: 400 });
    }
    if (!Number.isFinite(metaHoras) || metaHoras < 1 || metaHoras > 8760) {
      return NextResponse.json({ error: 'metaHoras inválida (1 a 8760).' }, { status: 400 });
    }

    const userEmail = guard.session.user.email ?? guard.session.user.id;

    const [updated] = await db
      .update(infraSlaConfig)
      .set({ metaHoras, updatedAt: new Date(), updatedBy: userEmail })
      .where(eq(infraSlaConfig.prioridade, prioridade))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Configuração não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[sla-config/PATCH]', err);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}
