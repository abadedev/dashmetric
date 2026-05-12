import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cobrancaImports, cobrancaRegistros } from '@/lib/db/schema';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

const STATUS_ABERTO = ['Bloqueado', 'Aviso de pendência'];

function parseVencimentosParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  try {
    const url = new URL(req.url);
    const vencimentosFiltro = parseVencimentosParam(url.searchParams.get('vencimentos'));

    const boletosBase: SQL[] = [eq(cobrancaRegistros.tipoLista, 'boletos_vencidos')];
    if (vencimentosFiltro.length > 0) {
      boletosBase.push(
        sql`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD') in (${sql.join(
          vencimentosFiltro.map((d) => sql`${d}`),
          sql`, `
        )})`
      );
    }
    const boletosWhere = and(...boletosBase);
    const preWhere = eq(cobrancaRegistros.tipoLista, 'pre_inativacao');

    const [
      boletosTotalRow,
      boletosPorStatus,
      boletosPorCidade,
      boletosPorVencimento,
      boletosPorDataPagamento,
      boletosPorPerfilAtraso,
      boletosPorMotivo,
      preTotalRow,
      prePorStatusCrm,
      prePorCidade,
      datasDisponiveisRows,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          valorTotal: sql<string>`coalesce(sum(${cobrancaRegistros.valor}), 0)::text`,
        })
        .from(cobrancaRegistros)
        .where(boletosWhere),

      db
        .select({
          status: sql<string>`coalesce(${cobrancaRegistros.statusSistema}, 'Sem status')`,
          count: sql<number>`count(*)::int`,
          valor: sql<string>`coalesce(sum(${cobrancaRegistros.valor}), 0)::text`,
        })
        .from(cobrancaRegistros)
        .where(boletosWhere)
        .groupBy(cobrancaRegistros.statusSistema)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          cidade: sql<string>`coalesce(${cobrancaRegistros.cidade}, 'Não informada')`,
          count: sql<number>`count(*)::int`,
          valor: sql<string>`coalesce(sum(${cobrancaRegistros.valor}), 0)::text`,
        })
        .from(cobrancaRegistros)
        .where(boletosWhere)
        .groupBy(cobrancaRegistros.cidade)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          data: sql<string>`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
          valor: sql<string>`coalesce(sum(${cobrancaRegistros.valor}), 0)::text`,
        })
        .from(cobrancaRegistros)
        .where(and(boletosWhere, sql`${cobrancaRegistros.vencimento} is not null`))
        .groupBy(sql`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`),

      db
        .select({
          data: sql<string>`to_char(${cobrancaRegistros.dataPagamento}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(cobrancaRegistros)
        .where(and(boletosWhere, sql`${cobrancaRegistros.dataPagamento} is not null`))
        .groupBy(sql`to_char(${cobrancaRegistros.dataPagamento}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${cobrancaRegistros.dataPagamento}, 'YYYY-MM-DD')`),

      db
        .select({
          perfil: sql<string>`case when ${cobrancaRegistros.perfilAtraso} is true then 'sim'
            when ${cobrancaRegistros.perfilAtraso} is false then 'nao'
            else 'sem_info' end`,
          count: sql<number>`count(*)::int`,
        })
        .from(cobrancaRegistros)
        .where(boletosWhere)
        .groupBy(sql`case when ${cobrancaRegistros.perfilAtraso} is true then 'sim'
          when ${cobrancaRegistros.perfilAtraso} is false then 'nao'
          else 'sem_info' end`)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          motivo: sql<string>`coalesce(${cobrancaRegistros.motivoAtraso}, 'Não informado')`,
          count: sql<number>`count(*)::int`,
        })
        .from(cobrancaRegistros)
        .where(boletosWhere)
        .groupBy(cobrancaRegistros.motivoAtraso)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(cobrancaRegistros)
        .where(preWhere),

      db
        .select({
          status: cobrancaRegistros.statusCrm,
          count: sql<number>`count(*)::int`,
        })
        .from(cobrancaRegistros)
        .where(preWhere)
        .groupBy(cobrancaRegistros.statusCrm)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          cidade: sql<string>`coalesce(${cobrancaRegistros.cidade}, 'Não informada')`,
          count: sql<number>`count(*)::int`,
        })
        .from(cobrancaRegistros)
        .where(preWhere)
        .groupBy(cobrancaRegistros.cidade)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          data: sql<string>`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`,
        })
        .from(cobrancaRegistros)
        .where(
          and(
            eq(cobrancaRegistros.tipoLista, 'boletos_vencidos'),
            sql`${cobrancaRegistros.vencimento} is not null`
          )
        )
        .groupBy(sql`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`)
        .orderBy(desc(sql`to_char(${cobrancaRegistros.vencimento}, 'YYYY-MM-DD')`)),
    ]);

    // Derivar KPIs a partir das agregações por status
    let convertidos = 0;
    let valorConvertidos = 0;
    let inativos = 0;
    let emAberto = 0;
    let valorEmAberto = 0;

    for (const row of boletosPorStatus) {
      const v = parseFloat(row.valor) || 0;
      if (row.status === 'Em dia') {
        convertidos += row.count;
        valorConvertidos += v;
      } else if (row.status === 'Inativo') {
        inativos += row.count;
      } else if (STATUS_ABERTO.includes(row.status)) {
        emAberto += row.count;
        valorEmAberto += v;
      }
    }

    const boletosTotal = boletosTotalRow[0]?.total ?? 0;
    const valorTotal = parseFloat(boletosTotalRow[0]?.valorTotal ?? '0') || 0;

    const [ultimoBoletos] = await db
      .select()
      .from(cobrancaImports)
      .where(eq(cobrancaImports.tipoLista, 'boletos_vencidos'))
      .orderBy(desc(cobrancaImports.importadoEm))
      .limit(1);

    const [ultimoPre] = await db
      .select()
      .from(cobrancaImports)
      .where(eq(cobrancaImports.tipoLista, 'pre_inativacao'))
      .orderBy(desc(cobrancaImports.importadoEm))
      .limit(1);

    return NextResponse.json({
      filtros: { vencimentos: vencimentosFiltro },
      datasVencimentoDisponiveis: datasDisponiveisRows.map((r) => r.data),
      boletos: {
        total: boletosTotal,
        valorTotal,
        convertidos,
        valorConvertidos,
        emAberto,
        valorEmAberto,
        inativos,
        taxaConversao: boletosTotal > 0 ? (convertidos / boletosTotal) * 100 : 0,
        porStatus: boletosPorStatus.map((r) => ({
          status: r.status,
          count: r.count,
          valor: parseFloat(r.valor) || 0,
        })),
        porCidade: boletosPorCidade.map((r) => ({
          cidade: r.cidade,
          count: r.count,
          valor: parseFloat(r.valor) || 0,
        })),
        porVencimento: boletosPorVencimento.map((r) => ({
          data: r.data,
          count: r.count,
          valor: parseFloat(r.valor) || 0,
        })),
        porDataPagamento: boletosPorDataPagamento,
        porPerfilAtraso: boletosPorPerfilAtraso,
        porMotivo: boletosPorMotivo,
      },
      preInativacao: {
        total: preTotalRow[0]?.total ?? 0,
        porStatusCrm: prePorStatusCrm,
        porCidade: prePorCidade,
      },
      ultimoImport: {
        boletos: ultimoBoletos ?? null,
        preInativacao: ultimoPre ?? null,
      },
    });
  } catch (err) {
    console.error('[cobranca/dados]', err);
    return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 });
  }
}
