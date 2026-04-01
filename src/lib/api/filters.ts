import { NextRequest } from 'next/server';
import { z } from 'zod';

export type ExternalGroupBy = 'day' | 'week' | 'month';

const FILTERS_SCHEMA = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.string().optional(),
  technicianId: z.coerce.number().int().positive().optional(),
  attendantId: z.string().trim().optional(),
  type: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(['open', 'closed', 'ok', 'nok', 'all']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  page: z.coerce.number().int().min(1).optional().default(1),
  city: z.string().trim().optional(),
  search: z.string().trim().optional(),
  resource: z.string().trim().optional(),
});

export type ExternalApiFilters = {
  startDate: Date | null;
  endDate: Date | null;
  period: string | null;
  technicianId: number | null;
  attendantId: string | null;
  type: string | null;
  category: string | null;
  status: 'open' | 'closed' | 'ok' | 'nok' | 'all' | null;
  groupBy: ExternalGroupBy;
  limit: number;
  page: number;
  offset: number;
  city: string | null;
  search: string | null;
  resource: string | null;
};

function parseDateInput(value: string, mode: 'start' | 'end') {
  const trimmed = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);

  const candidate = dateOnly
    ? new Date(`${trimmed}T${mode === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`)
    : new Date(trimmed);

  if (Number.isNaN(candidate.getTime())) {
    throw new Error(`Invalid ${mode === 'start' ? 'startDate' : 'endDate'} value.`);
  }

  return candidate;
}

function resolvePeriod(period: string | undefined) {
  if (!period) return { startDate: null, endDate: null, period: null as string | null };

  const normalized = period.trim().toLowerCase();
  const now = new Date();

  if (normalized === '7d' || normalized === '30d' || normalized === '90d') {
    const days = Number(normalized.replace('d', ''));
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);

    return { startDate, endDate, period: normalized };
  }

  if (normalized === 'current_month') {
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
    return { startDate, endDate, period: normalized };
  }

  if (normalized === 'previous_month') {
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    return { startDate, endDate, period: normalized };
  }

  throw new Error('Invalid period value. Use 7d, 30d, 90d, current_month or previous_month.');
}

export function parseExternalApiFilters(req: NextRequest): ExternalApiFilters {
  const searchParams = req.nextUrl.searchParams;
  const parsed = FILTERS_SCHEMA.parse({
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    period: searchParams.get('period') ?? undefined,
    technicianId: searchParams.get('technicianId') ?? undefined,
    attendantId: searchParams.get('attendantId') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    groupBy: searchParams.get('groupBy') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    resource: searchParams.get('resource') ?? undefined,
  });

  const periodRange = resolvePeriod(parsed.period);
  const startDate = parsed.startDate
    ? parseDateInput(parsed.startDate, 'start')
    : periodRange.startDate;
  const endDate = parsed.endDate
    ? parseDateInput(parsed.endDate, 'end')
    : periodRange.endDate;

  if (startDate && endDate && startDate > endDate) {
    throw new Error('startDate cannot be greater than endDate.');
  }

  return {
    startDate,
    endDate,
    period: periodRange.period,
    technicianId: parsed.technicianId ?? null,
    attendantId: parsed.attendantId || null,
    type: parsed.type || null,
    category: parsed.category || null,
    status: parsed.status ?? null,
    groupBy: parsed.groupBy,
    limit: parsed.limit,
    page: parsed.page,
    offset: (parsed.page - 1) * parsed.limit,
    city: parsed.city || null,
    search: parsed.search || null,
    resource: parsed.resource || null,
  };
}

export function serializeAppliedFilters(filters: ExternalApiFilters) {
  return {
    startDate: filters.startDate?.toISOString() ?? null,
    endDate: filters.endDate?.toISOString() ?? null,
    period: filters.period,
    technicianId: filters.technicianId,
    attendantId: filters.attendantId,
    type: filters.type,
    category: filters.category,
    status: filters.status,
    groupBy: filters.groupBy,
    limit: filters.limit,
    page: filters.page,
    city: filters.city,
    search: filters.search,
    resource: filters.resource,
  };
}
