export interface CalculateSLAOptions {
  holidayKeys?: Set<string>;
}

export interface CalculateSLAResult {
  slaCorridoSegundos: number;
  slaUtilSegundos: number;
}

const WEEKDAY_OPEN_HOUR = 8;
const WEEKDAY_CLOSE_HOUR = 18;
const SATURDAY_OPEN_HOUR = 8;
const SATURDAY_CLOSE_HOUR = 12;

export function calculateSLA(
  startAt: Date,
  endAt: Date,
  options: CalculateSLAOptions = {}
): CalculateSLAResult {
  if (!isValidDate(startAt) || !isValidDate(endAt) || endAt <= startAt) {
    return {
      slaCorridoSegundos: 0,
      slaUtilSegundos: 0,
    };
  }

  const holidayKeys = options.holidayKeys ?? new Set<string>();

  return {
    slaCorridoSegundos: diffInSeconds(startAt, endAt),
    slaUtilSegundos: calculateBusinessSeconds(startAt, endAt, holidayKeys),
  };
}

export function calculateBusinessSeconds(
  startAt: Date,
  endAt: Date,
  holidayKeys: Set<string> = new Set()
): number {
  if (!isValidDate(startAt) || !isValidDate(endAt) || endAt <= startAt) {
    return 0;
  }

  let totalSeconds = 0;
  let cursor = startOfDay(startAt);
  const lastDay = startOfDay(endAt);

  while (cursor <= lastDay) {
    const window = getBusinessWindow(cursor, holidayKeys);

    if (window) {
      const effectiveStart = maxDate(startAt, window.startAt);
      const effectiveEnd = minDate(endAt, window.endAt);

      if (effectiveEnd > effectiveStart) {
        totalSeconds += diffInSeconds(effectiveStart, effectiveEnd);
      }
    }

    cursor = addDays(cursor, 1);
  }

  return totalSeconds;
}

export function normalizeHolidayKeys(values: Iterable<Date | string>): Set<string> {
  const keys = new Set<string>();

  for (const value of Array.from(values)) {
    if (typeof value === 'string') {
      keys.add(value.slice(0, 10));
      continue;
    }

    if (isValidDate(value)) {
      keys.add(toLocalDateKey(value));
    }
  }

  return keys;
}

function getBusinessWindow(
  day: Date,
  holidayKeys: Set<string>
): { startAt: Date; endAt: Date } | null {
  const dayOfWeek = day.getDay();
  const dateKey = toLocalDateKey(day);

  if (dayOfWeek === 0 || holidayKeys.has(dateKey)) {
    return null;
  }

  if (dayOfWeek === 6) {
    return {
      startAt: withTime(day, SATURDAY_OPEN_HOUR, 0, 0),
      endAt: withTime(day, SATURDAY_CLOSE_HOUR, 0, 0),
    };
  }

  return {
    startAt: withTime(day, WEEKDAY_OPEN_HOUR, 0, 0),
    endAt: withTime(day, WEEKDAY_CLOSE_HOUR, 0, 0),
  };
}

function diffInSeconds(startAt: Date, endAt: Date): number {
  return Math.max(0, Math.floor((endAt.getTime() - startAt.getTime()) / 1000));
}

function withTime(base: Date, hours: number, minutes: number, seconds: number): Date {
  const result = new Date(base);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function toLocalDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function maxDate(left: Date, right: Date): Date {
  return left >= right ? left : right;
}

function minDate(left: Date, right: Date): Date {
  return left <= right ? left : right;
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
