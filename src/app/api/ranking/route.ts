import { NextRequest, NextResponse } from 'next/server';
import { getAtendimentosCollection } from '@/lib/db/mongo';
import { formatSecondsToHHMMSS } from '@/lib/importacao/helpers';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');
    const city    = searchParams.get('city');

    const col = await getAtendimentosCollection();

    // Filtro base de data
    const dateFilter: Record<string, Date> = {};
    if (fromStr) dateFilter.$gte = new Date(fromStr);
    if (toStr)   dateFilter.$lte = new Date(toStr);

    const baseMatch: Record<string, unknown> = {};
    if (fromStr || toStr) {
      baseMatch.$or = [
        { aberturaAt: dateFilter },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: dateFilter }] },
        { $and: [{ aberturaAt: null }, { finalizacaoAt: null }, { createdAt: dateFilter }] },
      ];
    }

    // Filtro de ranking (inclui cidade)
    const rankingMatch: Record<string, unknown> = {
      ...baseMatch,
      tecnicoId: { $ne: null },  // equivalente ao INNER JOIN
    };
    if (city && city !== 'all') rankingMatch.cidade = city;

    const [citiesRaw, rankingRaw] = await Promise.all([
      col.distinct('cidade', baseMatch),

      col.aggregate([
        { $match: rankingMatch },
        {
          $group: {
            _id: { tecnicoId: '$tecnicoId', tecnico: '$tecnico' },
            totalOS:     { $sum: 1 },
            instNova:    { $sum: { $cond: [{ $eq: ['$tipo', 'Instalação (Nova)'] }, 1, 0] } },
            instReativ:  { $sum: { $cond: [{ $eq: ['$tipo', 'Instalação (Reativação)'] }, 1, 0] } },
            reparo:      { $sum: { $cond: [{ $eq: ['$tipo', 'Reparo'] }, 1, 0] } },
            mudEndereco: { $sum: { $cond: [{ $eq: ['$tipo', 'Mudança de Endereço'] }, 1, 0] } },
            retiradaKit: { $sum: { $cond: [{ $eq: ['$tipo', 'Retirada de Kit'] }, 1, 0] } },
            mudPlano:    { $sum: { $cond: [{ $eq: ['$tipo', 'Mudança de Plano'] }, 1, 0] } },
            retorno:     { $sum: { $cond: [{ $eq: ['$tipo', 'Retorno'] }, 1, 0] } },
            withinSlaUtil:  { $sum: { $cond: [{ $eq: ['$dentroSlaUtil', true] }, 1, 0] } },
            concluded:      { $sum: { $cond: [{ $ne: ['$finalizacaoAt', null] }, 1, 0] } },
            avgSlaUtilSeg:  {
              $avg: { $cond: [{ $ne: ['$finalizacaoAt', null] }, '$slaUtilSegundos', null] },
            },
          },
        },
        { $sort: { totalOS: -1 } },
      ]).toArray(),
    ]);

    const ranking = rankingRaw.map((r, i) => ({
      position:        i + 1,
      technicianId:    r._id.tecnicoId,
      technicianName:  r._id.tecnico,
      totalOS:         r.totalOS,
      instNova:        r.instNova,
      instReativacao:  r.instReativ,
      reparo:          r.reparo,
      mudancaEndereco: r.mudEndereco,
      retiradaKit:     r.retiradaKit,
      mudancaPlano:    r.mudPlano,
      retorno:         r.retorno,
      withinSlaUtil:   r.withinSlaUtil,
      concluded:       r.concluded,
      avgSlaUtilFormatted: formatSecondsToHHMMSS(Math.floor(Number(r.avgSlaUtilSeg) || 0)),
      slaUtilPercent: Number(r.concluded) > 0
        ? Math.round((Number(r.withinSlaUtil) / Number(r.concluded)) * 100)
        : null,
      isTop5: i < 5,
    }));

    return NextResponse.json({
      ranking,
      cities: citiesRaw
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    console.error('[ranking]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
