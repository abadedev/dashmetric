export interface PeriodoOmnichannel {
  startDate: string;
  endDate: string;
  periodMonth: number;
  periodYear: number;
}

function parseDateFragment(
  s: string
): { day: number; month: number; year?: number } | null {
  const clean = s.replace(/[^0-9\/\-]/g, '');

  const withSep = clean.match(/^(\d{1,2})[\/\-](\d{2})(?:[\/\-](\d{4}))?$/);
  if (withSep) {
    return {
      day: parseInt(withSep[1], 10),
      month: parseInt(withSep[2], 10),
      year: withSep[3] ? parseInt(withSep[3], 10) : undefined,
    };
  }

  if (/^\d{8}$/.test(clean)) {
    return {
      day: parseInt(clean.slice(0, 2), 10),
      month: parseInt(clean.slice(2, 4), 10),
      year: parseInt(clean.slice(4, 8), 10),
    };
  }

  if (/^\d{4}$/.test(clean)) {
    return {
      day: parseInt(clean.slice(0, 2), 10),
      month: parseInt(clean.slice(2, 4), 10),
    };
  }

  return null;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extrairPeriodoDoNomeArquivo(fileName: string): PeriodoOmnichannel | null {
  const name = fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, ' ').trim();
  const match = name.match(/(\d[\d\/\-]*\d|\d{4})\s+[aà]\s+(\d[\d\/\-]*\d|\d{8})/i);
  if (!match) return null;

  const startFrag = parseDateFragment(match[1]);
  const endFrag = parseDateFragment(match[2]);

  if (!endFrag?.year || !startFrag) return null;

  const year = endFrag.year;
  if (
    endFrag.month < 1 || endFrag.month > 12 ||
    startFrag.month < 1 || startFrag.month > 12 ||
    endFrag.day < 1 || endFrag.day > 31 ||
    startFrag.day < 1 || startFrag.day > 31 ||
    year < 2000 || year > 2100
  ) {
    return null;
  }

  return {
    startDate: toISODate(year, startFrag.month, startFrag.day),
    endDate: toISODate(year, endFrag.month, endFrag.day),
    periodMonth: endFrag.month,
    periodYear: year,
  };
}
