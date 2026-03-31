import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos, technicians } from '@/lib/db/schema';
import { desc, eq, and, count, ilike, gte, lte } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page        = Number(searchParams.get('page')     || 1);
    const pageSize    = Number(searchParams.get('pageSize') || 50);
    const fromStr     = searchParams.get('from');
    const toStr       = searchParams.get('to');
    const type        = searchParams.get('type');
    const technicianId= searchParams.get('technicianId');
    const city        = searchParams.get('city');
    const slaStatus   = searchParams.get('slaStatus'); // 'ok' | 'nok' | 'all'
    const search      = searchParams.get('search');

    const filters = [];
    if (fromStr)      filters.push(gte(atendimentos.aberturaAt, new Date(fromStr)));
    if (toStr)        filters.push(lte(atendimentos.aberturaAt, new Date(toStr)));
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
          periodMonth:      atendimentos.periodMonth,
          periodYear:       atendimentos.periodYear,
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
        .orderBy(desc(atendimentos.aberturaAt))
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
