const SLA_METAS: Record<string, number | null> = {
  'Instalação (Nova)': 30,
  'Instalação (Reativação)': 30,
  Reparo: 24,
  'Mudança de Endereço': 48,
  'Mudança de Plano': 24,
  'Retirada de Kit': null,
  Retorno: null,
  'Cancelado – Reparo': null,
  'Cancelado – Retirada de Kit': null,
  'Cancelado – Mudança de Endereço': null,
  'Cancelado – Retorno': null,
  'Cancelado – Reativação de Login': null,
};

export function slaMetaHoras(tipo: string): number | null {
  return SLA_METAS[tipo] ?? null;
}

export function calcularSLACorrido(abertura: Date, finalizacao: Date): number {
  return Math.max(0, Math.round((finalizacao.getTime() - abertura.getTime()) / 1000));
}

export function calcularSLAUtil(
  abertura: Date,
  finalizacao: Date,
  feriados: Set<string> = new Set()
): number {
  if (finalizacao <= abertura) return 0;

  const HORA_INI_SEG_SEX = 8;
  const HORA_FIM_SEG_SEX = 18;
  const HORA_INI_SAB = 8;
  const HORA_FIM_SAB = 12;

  const horaInicio = (diaSemana: number) =>
    diaSemana === 6 ? HORA_INI_SAB : HORA_INI_SEG_SEX;
  const horaFim = (diaSemana: number) =>
    diaSemana === 6 ? HORA_FIM_SAB : HORA_FIM_SEG_SEX;
  const temExpediente = (data: Date) =>
    data.getDay() !== 0 && !feriados.has(toDateKey(data));

  const ajustarAbertura = (data: Date): Date => {
    let cursor = new Date(data);
    let guard = 0;

    while (guard++ < 60) {
      const dia = cursor.getDay();

      if (dia === 0 || feriados.has(toDateKey(cursor))) {
        cursor = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate() + 1,
          HORA_INI_SEG_SEX,
          0,
          0,
          0
        );
        continue;
      }

      const inicio = horaInicio(dia);
      const fim = horaFim(dia);
      const horaAtual =
        cursor.getHours() + cursor.getMinutes() / 60 + cursor.getSeconds() / 3600;

      if (horaAtual >= fim) {
        cursor =
          dia === 6
            ? new Date(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate() + 2,
                HORA_INI_SEG_SEX,
                0,
                0,
                0
              )
            : new Date(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate() + 1,
                HORA_INI_SEG_SEX,
                0,
                0,
                0
              );
        continue;
      }

      if (horaAtual < inicio) {
        cursor.setHours(inicio, 0, 0, 0);
      }

      return cursor;
    }

    return cursor;
  };

  let atual = ajustarAbertura(abertura);
  let totalSeg = 0;
  let iter = 0;

  while (atual < finalizacao && iter++ < 500) {
    const dia = atual.getDay();

    if (!temExpediente(atual)) {
      atual = new Date(
        atual.getFullYear(),
        atual.getMonth(),
        atual.getDate() + 1,
        HORA_INI_SEG_SEX,
        0,
        0,
        0
      );
      continue;
    }

    const inicioExpediente = new Date(
      atual.getFullYear(),
      atual.getMonth(),
      atual.getDate(),
      horaInicio(dia),
      0,
      0,
      0
    );

    const fimExpediente = new Date(
      atual.getFullYear(),
      atual.getMonth(),
      atual.getDate(),
      horaFim(dia),
      0,
      0,
      0
    );

    const inicioEfetivo = atual > inicioExpediente ? atual : inicioExpediente;
    const mesmoDiaFechamento = toDateKey(atual) === toDateKey(finalizacao);
    const fimEfetivo = mesmoDiaFechamento ? finalizacao : fimExpediente;

    if (fimEfetivo > inicioEfetivo) {
      totalSeg += (fimEfetivo.getTime() - inicioEfetivo.getTime()) / 1000;
    }

    atual =
      dia === 6
        ? new Date(
            atual.getFullYear(),
            atual.getMonth(),
            atual.getDate() + 2,
            HORA_INI_SEG_SEX,
            0,
            0,
            0
          )
        : new Date(
            atual.getFullYear(),
            atual.getMonth(),
            atual.getDate() + 1,
            HORA_INI_SEG_SEX,
            0,
            0,
            0
          );
  }

  return Math.round(totalSeg);
}

export function dentroSLA(segundos: number, metaHoras: number | null): boolean | null {
  if (metaHoras === null) return null;
  return segundos <= metaHoras * 3600;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
