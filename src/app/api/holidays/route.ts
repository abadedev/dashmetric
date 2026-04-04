import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { holidays } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';

export const runtime = 'nodejs';

// GET /api/holidays — lista todos os feriados
export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const rows = await db.select().from(holidays).orderBy(asc(holidays.date));
      return NextResponse.json({ data: rows });
    } catch (err) {
      console.error('[holidays GET]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

// POST /api/holidays — cria um ou vários feriados
// Body: { date: "YYYY-MM-DD", name: "Nome" }
//    ou array: [{ date, name }, ...]
export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
  try {
    const body = await req.json();
    const items: { date: string; name: string }[] = Array.isArray(body) ? body : [body];

    if (!items.length) {
      return NextResponse.json({ error: 'Nenhum feriado informado.' }, { status: 400 });
    }

    const invalid = items.find((h) => !h.date || !h.name || !/^\d{4}-\d{2}-\d{2}$/.test(h.date));
    if (invalid) {
      return NextResponse.json(
        { error: 'Todos os feriados devem ter "date" (YYYY-MM-DD) e "name".' },
        { status: 400 }
      );
    }

    const toInsert = items.map((h) => ({
      date: h.date,
      name: h.name.trim(),
      year: parseInt(h.date.slice(0, 4), 10),
    }));

    // upsert: ignora conflito de data duplicada
    const inserted = await db
      .insert(holidays)
      .values(toInsert)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({ inserted: inserted.length, total: items.length });
  } catch (err) {
    console.error('[holidays POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}

// DELETE /api/holidays?date=YYYY-MM-DD — remove um feriado
export async function DELETE(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  return runWithWorkspace(req, async () => {
    try {
      const date = new URL(req.url).searchParams.get('date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Parâmetro "date" (YYYY-MM-DD) obrigatório.' }, { status: 400 });
      }

      await db.delete(holidays).where(eq(holidays.date, date));
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[holidays DELETE]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
