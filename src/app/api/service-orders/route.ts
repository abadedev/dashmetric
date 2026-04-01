import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { atendimentos } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';
import { and, eq, ilike, desc, count, sql, SQL } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, Number(searchParams.get('page')     || 1));
    const pageSize     = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const fromStr      = searchParams.get('from');
    const toStr        = searchParams.get('to');
    const type         = searchParams.get('type');
    const technicianId = searchParams.get('technicianId');
    const city         = searchParams.get('city');
    const slaStatus    = searchParams.get('slaStatus'); // 'ok' | 'nok' | 'all'
    const search       = searchParams.get('search');

    const filters: SQL[] = [];

    // Filtro de data: COALESCE(aberturaAt, finalizacaoAt, createdAt) equivalente ao $or do Mongo
    if (fromStr || toStr) {
      const dataRef = sql`COALESCE(${atendimentos.aberturaAt}, ${atendimentos.finalizacaoAt}, ${atendimentos.createdAt})`;
      const parts: SQL[] = [];
      if (fromStr) parts.push(sql`${dataRef} >= ${new Date(fromStr)}`);
      if (toStr)   parts.push(sql`${dataRef} <= ${new Date(toStr)}`);
      if (parts.length === 2) filters.push(sql`(${parts[0]} AND ${parts[1]})`);
      else if (parts.length === 1) filters.push(parts[0]);
    }

    if (type)         filters.push(eq(atendimentos.tipo, type));
    if (technicianId) filters.push(eq(atendimentos.tecnicoId, Number(technicianId)));
    if (city)         filters.push(eq(atendimentos.cidade, city));
    if (slaStatus === 'ok')  filters.push(eq(atendimentos.dentroSlaUtil, true));
    if (slaStatus === 'nok') filters.push(eq(atendimentos.dentroSlaUtil, false));
    if (search)       filters.push(ilike(atendimentos.numeroOs, `%${search}%`));

    const whereClause = filters.length ? and(...filters) : undefined;
    const offset = (page - 1) * pageSize;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id:                atendimentos.id,
          numeroOs:          atendimentos.numeroOs,
          tipo:              atendimentos.tipo,
          motivo:            atendimentos.motivo,
          solucao:           atendimentos.solucao,
          cliente:           atendimentos.cliente,
          cidade:            atendimentos.cidade,
          plano:             atendimentos.plano,
          aberturaAt:        atendimentos.aberturaAt,
          finalizacaoAt:     atendimentos.finalizacaoAt,
          slaHoras:          atendimentos.slaHoras,
          slaCorridoSegundos:atendimentos.slaCorridoSegundos,
          slaUtilSegundos:   atendimentos.slaUtilSegundos,
          dentroSla:         atendimentos.dentroSla,
          dentroSlaUtil:     atendimentos.dentroSlaUtil,
          periodMonth:       atendimentos.periodMonth,
          periodYear:        atendimentos.periodYear,
          tecnico:           atendimentos.tecnico,
          tecnicoId:         atendimentos.tecnicoId,
          login:             atendimentos.login,
          bairro:            atendimentos.bairro,
          atendente:         atendimentos.atendente,
          mac:               atendimentos.mac,
          empresa:           atendimentos.empresa,
          observacao:        atendimentos.observacao,
          telefones:         atendimentos.telefones,
        })
        .from(atendimentos)
        .where(whereClause)
        .orderBy(desc(atendimentos.aberturaAt))
        .limit(pageSize)
        .offset(offset),

      db.select({ total: count() }).from(atendimentos).where(whereClause),
    ]);

    const total = totalRow?.total ?? 0;

    const data = rows.map((r) => ({
      id:               String(r.id),
      osNumber:         r.numeroOs,
      activityType:     r.tipo,
      reason:           r.motivo,
      solution:         r.solucao,
      clientName:       r.cliente,
      city:             r.cidade,
      plan:             r.plano,
      openedAt:         r.aberturaAt,
      closedAt:         r.finalizacaoAt,
      slaTargetHours:   r.slaHoras != null ? Number(r.slaHoras) : null,
      slaCorridoSeconds:r.slaCorridoSegundos,
      slaUtilSeconds:   r.slaUtilSegundos,
      withinSlaCorrido: r.dentroSla,
      withinSlaUtil:    r.dentroSlaUtil,
      periodMonth:      r.periodMonth,
      periodYear:       r.periodYear,
      technicianName:   r.tecnico,
      login:            r.login,
      bairro:           r.bairro,
      atendente:        r.atendente,
      mac:              r.mac,
      empresa:          r.empresa,
      observacao:       r.observacao,
      telefones:        r.telefones,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('[service-orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
