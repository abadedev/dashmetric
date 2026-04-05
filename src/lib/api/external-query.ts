import type { ExternalApiFilters } from './filters';
import { getSummaryAnalytics } from '@/lib/services/analytics/summary-analytics';
import {
  getInstallationsAnalytics,
  getAttendancesAnalytics,
  getSlaAnalytics,
} from '@/lib/services/analytics/attendance-analytics';
import { getRankingAnalytics } from '@/lib/services/analytics/ranking-analytics';
import { getPhoneSupportAnalytics } from '@/lib/services/analytics/phone-support-analytics';
import { getSalesAnalytics } from '@/lib/services/analytics/sales-analytics';
import { getCancellationsAnalytics } from '@/lib/services/analytics/cancellations-analytics';
import { getQualityAnalytics } from '@/lib/services/analytics/quality-analytics';

export class ExternalApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
  }
}

export const EXTERNAL_QUERY_RESOURCE_MAP = {
  summary: getSummaryAnalytics,
  installations: getInstallationsAnalytics,
  attendances: getAttendancesAnalytics,
  ranking: getRankingAnalytics,
  'phone-support': getPhoneSupportAnalytics,
  sla: getSlaAnalytics,
  sales: getSalesAnalytics,
  cancellations: getCancellationsAnalytics,
  quality: getQualityAnalytics,
} as const;

export const EXTERNAL_QUERY_RESOURCE_KEYS = Object.keys(EXTERNAL_QUERY_RESOURCE_MAP);

export type ExternalQueryResource = keyof typeof EXTERNAL_QUERY_RESOURCE_MAP;

export function parseExternalQueryResource(resource: string | null | undefined): ExternalQueryResource {
  const normalized = resource?.trim().toLowerCase();

  if (!normalized) {
    throw new ExternalApiRequestError(
      `O parâmetro "resource" é obrigatório. Use um destes valores: ${EXTERNAL_QUERY_RESOURCE_KEYS.join(', ')}.`,
      400,
      'missing_resource'
    );
  }

  if (!(normalized in EXTERNAL_QUERY_RESOURCE_MAP)) {
    throw new ExternalApiRequestError(
      `Resource inválido: "${resource}". Use um destes valores: ${EXTERNAL_QUERY_RESOURCE_KEYS.join(', ')}.`,
      400,
      'invalid_resource'
    );
  }

  return normalized as ExternalQueryResource;
}

export async function resolveExternalQueryResource(resource: ExternalQueryResource, filters: ExternalApiFilters) {
  const resolver = EXTERNAL_QUERY_RESOURCE_MAP[resource];
  return resolver(filters);
}
