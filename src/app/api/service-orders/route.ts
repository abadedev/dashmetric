import { NextRequest, NextResponse } from 'next/server';
import { getAtendimentosCollection } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/require-auth';
import type { Filter } from 'mongodb';
import type { AtendimentoDoc } from '@/lib/db/mongo-types';

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

    const col = await getAtendimentosCollection();

    // Filtro de data: usa aberturaAt com fallback para finalizacaoAt/createdAt
    const filter: Filter<AtendimentoDoc> = {};

    const dateFilter: Record<string, Date> = {};
    if (fromStr) dateFilter.$gte = new Date(fromStr);
    if (toStr)   dateFilter.$lte = new Date(toStr);

    if (fromStr || toStr) {
      filter.$or = [
        { aberturaAt: dateFilter as any },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: dateFilter as any }] },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: null }, { createdAt: dateFilter as any }] },
      ];
    }

    if (type)          filter.tipo = type;
    if (technicianId)  filter.tecnicoId = Number(technicianId);
    if (city)          filter.cidade = city;
    if (slaStatus === 'ok')  filter.dentroSlaUtil = true;
    if (slaStatus === 'nok') filter.dentroSlaUtil = false;
    if (search)        filter.numeroOs = { $regex: search, $options: 'i' };

    const offset = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      col
        .find(filter, {
          projection: {
            numeroOs: 1, tipo: 1, motivo: 1, solucao: 1,
            cliente: 1, cidade: 1, plano: 1,
            aberturaAt: 1, finalizacaoAt: 1,
            slaHoras: 1, slaCorridoSegundos: 1, slaUtilSegundos: 1,
            dentroSla: 1, dentroSlaUtil: 1,
            periodMonth: 1, periodYear: 1,
            tecnico: 1, tecnicoId: 1,
            login: 1, bairro: 1, atendente: 1, mac: 1, empresa: 1,
            observacao: 1, telefones: 1,
          },
        })
        .sort({ aberturaAt: -1 })
        .skip(offset)
        .limit(pageSize)
        .toArray(),
      col.countDocuments(filter),
    ]);

    const data = rows.map((r) => ({
      id:               r._id?.toString(),
      osNumber:         r.numeroOs,
      activityType:     r.tipo,
      reason:           r.motivo,
      solution:         r.solucao,
      clientName:       r.cliente,
      city:             r.cidade,
      plan:             r.plano,
      openedAt:         r.aberturaAt,
      closedAt:         r.finalizacaoAt,
      slaTargetHours:   r.slaHoras,
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
