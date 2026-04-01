import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, technicians } from '@/lib/db/schema';
import { desc, eq, and, count, ilike, gte, lte, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const page        = Math.max(1, Number(searchParams.get('page')     || 1));
    const pageSize    = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const fromStr     = searchParams.get('from');
    const toStr       = searchParams.get('to');
    const type        = searchParams.get('type');
    const technicianId= searchParams.get('technicianId');
    const city        = searchParams.get('city');
    const slaStatus   = searchParams.get('slaStatus'); // 'ok' | 'nok' | 'all'
    const search      = searchParams.get('search');
    const dataRef = sql<Date>`coalesce(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
    const periodMonthExpr = sql<number>`extract(month from ${dataRef})::int`;
    const periodYearExpr = sql<number>`extract(year from ${dataRef})::int`;

    const filters = [];
    if (fromStr)      filters.push(gte(dataRef, new Date(fromStr)));
    if (toStr)        filters.push(lte(dataRef, new Date(toStr)));
    if (type)         filters.push(eq(atendimentos.tipo, type));
    if (technicianId) filters.push(eq(atendimentos.tecnicoId, Number(technicianId)));
    if (city)         filters.push(eq(atendimentos.cidade, city));
    if (slaStatus === 'ok')  filters.push(eq(atendimentos.dentroSlaUtil, true));
    if (slaStatus === 'nok') filters.push(eq(atendimentos.dentroSlaUtil, false));
    if (search)       filters.push(ilike(atendimentos.numeroOs, `%${search}%`));

    const offset = (page - 1) * pageSize;

    const [rows, [totalResult]] = await Promise.all([
      db
        .select({
          id:               atendimentos.id,
          osNumber:         atendimentos.numeroOs,
          activityType:     atendimentos.tipo,          // alias para compat. com frontend
          reason:           atendimentos.motivo,
          solution:         atendimentos.solucao,
          clientName:       atendimentos.cliente,
          city:             atendimentos.cidade,
          plan:             atendimentos.plano,
          openedAt:         atendimentos.aberturaAt,    // alias
          closedAt:         atendimentos.finalizacaoAt, // alias
          slaTargetHours:   atendimentos.slaHoras,
          slaCorridoSeconds:atendimentos.slaCorridoSegundos,
          slaUtilSeconds:   atendimentos.slaUtilSegundos,
          withinSlaCorrido: atendimentos.dentroSla,
          withinSlaUtil:    atendimentos.dentroSlaUtil,
          periodMonth:      periodMonthExpr,
          periodYear:       periodYearExpr,
          technicianName:   technicians.name,
          // campos extras
          login:       atendimentos.login,
          bairro:      atendimentos.bairro,
          atendente:   atendimentos.atendente,
          mac:         atendimentos.mac,
          empresa:     atendimentos.empresa,
          observacao:  atendimentos.observacao,
          telefones:   atendimentos.telefones,
        })
        .from(atendimentos)
        .leftJoin(technicians, eq(atendimentos.tecnicoId, technicians.id))
        .where(and(...filters))
        .orderBy(desc(dataRef))
        .limit(pageSize)
        .offset(offset),

      db
        .select({ total: count() })
        .from(atendimentos)
        .where(and(...filters)),
    ]);

    return NextResponse.json({
      data: rows,
      total: totalResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize),
    });
  } catch (err) {
    console.error('[service-orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
