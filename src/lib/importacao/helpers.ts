import * as crypto from 'crypto';

// ── Normalização de headers ───────────────────────────────────────────────────

export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_#]/g, '');
}

// ── Parsing de data/hora no formato BR ───────────────────────────────────────

/**
 * Divide "DD/MM/YY - HH:MM" em { date: "DD/MM/YY", time: "HH:MM" }.
 * Também aceita só a parte de data ou só a de hora.
 */
export function splitBRDateTime(value: string): { date: string; time: string } {
  const v = (value ?? '').trim();

  // Formato com " - ": "20/03/26 - 15:58"
  const dashIdx = v.indexOf(' - ');
  if (dashIdx !== -1) {
    return { date: v.slice(0, dashIdx).trim(), time: v.slice(dashIdx + 3).trim() };
  }

  // Datas relativas: "Hoje 08:21", "Ontem 14:30", "Anteontem 11:22"
  const relMatch = v.match(/^(hoje|ontem|anteontem)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/i);
  if (relMatch) {
    return { date: relMatch[1], time: relMatch[2] };
  }

  return { date: v, time: '' };
}

// Mapa de datas relativas em português
const DATAS_RELATIVAS: Record<string, number> = {
  hoje:       0,
  ontem:     -1,
  anteontem: -2,
};

function brDateToISO(year: number, month: number, day: number, h = 0, m = 0, s = 0): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(h)}:${pad(m)}:${pad(s)}-03:00`);
}

/**
 * Converte "DD/MM/YY", "DD/MM/YYYY", "Hoje", "Ontem" ou "Anteontem"
 * para um objeto Date em horário de Brasília (UTC-3). Retorna null se inválido.
 */
export function parseBRDate(dateStr: string): Date | null {
  const v = (dateStr ?? '').trim();
  if (!v) return null;

  // Datas relativas — calcula a data atual em Sao Paulo
  const key = v.toLowerCase();
  if (key in DATAS_RELATIVAS) {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const y  = Number(parts.find((p) => p.type === 'year')!.value);
    const mo = Number(parts.find((p) => p.type === 'month')!.value);
    const d  = Number(parts.find((p) => p.type === 'day')!.value);
    const base = brDateToISO(y, mo, d);
    base.setUTCDate(base.getUTCDate() + DATAS_RELATIVAS[key]);
    return base;
  }

  // Formato DD/MM/YY ou DD/MM/YYYY
  const parts = v.split('/');
  if (parts.length < 3) {
    // Tenta detectar se é um número serial do Excel (ex: "46063")
    const serial = Number(v);
    if (!isNaN(serial) && serial > 30000 && serial < 60000) {
      // Serial 1 = 1900-01-01; epoch Excel = 1899-12-30
      const utcMs = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
      const tmp = new Date(utcMs);
      return brDateToISO(tmp.getUTCFullYear(), tmp.getUTCMonth() + 1, tmp.getUTCDate());
    }
    return null;
  }
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const rawYear = Number(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(rawYear)) return null;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const d = brDateToISO(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Monta um Date a partir de data BR + hora ("HH:MM" ou "HH:MM:SS") em horário de Brasília.
 */
export function parseBRDateWithTime(dateStr: string, timeStr: string): Date | null {
  const base = parseBRDate(dateStr);
  if (!base) return null;
  if (!timeStr) return base;
  const normalizedTime = normalizeExcelTime(timeStr);
  const timeParts = normalizedTime.split(':').map(Number);
  // Re-extract the Sao Paulo calendar date from base, then rebuild with explicit time
  const dateParts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(base);
  const y  = Number(dateParts.find((p) => p.type === 'year')!.value);
  const mo = Number(dateParts.find((p) => p.type === 'month')!.value);
  const d  = Number(dateParts.find((p) => p.type === 'day')!.value);
  return brDateToISO(y, mo, d, timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
}

function normalizeExcelTime(timeStr: string): string {
  const raw = (timeStr ?? '').trim();
  if (!raw) return '';

  if (raw.includes(':')) return raw;

  const numeric = Number(raw.replace(',', '.'));
  if (!isNaN(numeric) && numeric >= 0 && numeric < 1) {
    const totalSeconds = Math.round(numeric * 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0'),
    ].join(':');
  }

  return raw;
}

// ── Parsing do campo Intervalo ────────────────────────────────────────────────

/**
 * Converte "05d - 01:12:20" ou "01:12:20" para total de segundos.
 * Retorna null se não reconhecer o formato.
 */
export function parseIntervalToSeconds(interval: string): number | null {
  const v = (interval ?? '').trim();
  if (!v) return null;

  // Formato com dias: "NNd - HH:MM:SS"
  const dayMatch = v.match(/^(\d+)d\s*-\s*(\d{1,2}):(\d{2}):(\d{2})$/);
  if (dayMatch) {
    const [, d, h, m, s] = dayMatch.map(Number);
    return d * 86400 + h * 3600 + m * 60 + s;
  }

  // Só tempo: "HH:MM:SS"
  const timeMatch = v.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch.map(Number);
    return h * 3600 + m * 60 + s;
  }

  return null;
}

// ── Formatação ────────────────────────────────────────────────────────────────

export function formatSecondsToHHMMSS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Hash de deduplicação ──────────────────────────────────────────────────────

/**
 * Gera SHA-256 estável a partir de um conjunto de campos.
 * Ordena as chaves para garantir consistência.
 */
export function gerarHash(fields: Record<string, string | null | undefined>): string {
  const canonical = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${String(fields[k] ?? '').trim().toLowerCase()}`)
    .join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ── Utilitários de texto ──────────────────────────────────────────────────────

export function normalizeTechName(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/[._-]+/g, ' ')   // "Ian.ferreira" / "Ian_ferreira" → "Ian ferreira"
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function trimOrNull(value: string | undefined | null): string | null {
  const v = (value ?? '').trim();
  return v === '' ? null : v;
}
