// ── Metas de SLA por tipo (horas) ────────────────────────────────────────────

const SLA_METAS: Record<string, number | null> = {
  'Instalação (Nova)':          30,
  'Instalação (Reativação)':    30,
  'Reparo':                     24,
  'Mudança de Endereço':        48,
  'Mudança de Plano':           24,
  'Retirada de Kit':            null,
  'Retorno':                    null,
  'Cancelado – Reparo':         null,
  'Cancelado – Retirada de Kit':null,
  'Cancelado – Mudança de Endereço': null,
  'Cancelado – Retorno':        null,
  'Cancelado – Reativação de Login': null,
};

export function slaMetaHoras(tipo: string): number | null {
  return SLA_METAS[tipo] ?? null;
}

// ── SLA Corrido ───────────────────────────────────────────────────────────────

/** Tempo total em segundos entre abertura e fechamento (sem filtros de expediente). */
export function calcularSLACorrido(abertura: Date, finalizacao: Date): number {
  return Math.max(0, Math.floor((finalizacao.getTime() - abertura.getTime()) / 1000));
}

// ── SLA Útil ─────────────────────────────────────────────────────────────────

/**
 * Calcula o tempo dentro do expediente entre duas datas.
 * Expediente padrão: Seg–Sex 08:00–18:00.
 * Sábados, domingos e feriados não contam.
 * Extensível: passe feriados como Set de strings "YYYY-MM-DD".
 */
export function calcularSLAUtil(
  abertura: Date,
  finalizacao: Date,
  feriados: Set<string> = new Set()
): number {
  if (finalizacao <= abertura) return 0;

  let totalSeg = 0;
  let cursor = new Date(abertura);

  while (cursor < finalizacao) {
    const dow = cursor.getDay(); // 0=Dom 6=Sáb
    const dateKey = toDateKey(cursor);
    const isFeriado = feriados.has(dateKey);

    let inicioExp: number | null = null;
    let fimExp: number | null = null;

    if (!isFeriado) {
      if (dow >= 1 && dow <= 5) { inicioExp = 8 * 3600; fimExp = 18 * 3600; }
      // Sábado e domingo: sem expediente por padrão
    }

    if (inicioExp !== null && fimExp !== null) {
      const baseDay = startOfDay(cursor);
      const cursorSeg = (cursor.getTime() - baseDay.getTime()) / 1000;

      // Limite do dia: se for o dia de fechamento, usa horário exato
      const isMesmoDia = toDateKey(cursor) === toDateKey(finalizacao);
      const limSeg = isMesmoDia
        ? (finalizacao.getTime() - baseDay.getTime()) / 1000
        : 24 * 3600;

      const efStart = Math.max(cursorSeg, inicioExp);
      const efEnd = Math.min(limSeg, fimExp);
      if (efEnd > efStart) totalSeg += efEnd - efStart;
    }

    // Avança para início do próximo dia
    cursor = startOfDay(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.floor(totalSeg);
}

// ── Dentro da meta ────────────────────────────────────────────────────────────

export function dentroSLA(segundos: number, metaHoras: number | null): boolean | null {
  if (metaHoras === null) return null;
  return segundos <= metaHoras * 3600;
}

// ── Utilitários internos ──────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
