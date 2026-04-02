import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getSummaryAnalytics } from '@/lib/services/analytics/summary-analytics';
import { getInstallationsAnalytics, getAttendancesAnalytics, getSlaAnalytics } from '@/lib/services/analytics/attendance-analytics';
import { getRankingAnalytics } from '@/lib/services/analytics/ranking-analytics';
import { getPhoneSupportAnalytics } from '@/lib/services/analytics/phone-support-analytics';
import { getSalesAnalytics } from '@/lib/services/analytics/sales-analytics';
import { getCancellationsAnalytics } from '@/lib/services/analytics/cancellations-analytics';
import { getQualityAnalytics } from '@/lib/services/analytics/quality-analytics';

export const runtime = 'nodejs';

const RESOURCE_MAP = {
  summary:         getSummaryAnalytics,
  installations:   getInstallationsAnalytics,
  attendances:     getAttendancesAnalytics,
  ranking:         getRankingAnalytics,
  'phone-support': getPhoneSupportAnalytics,
  sla:             getSlaAnalytics,
  sales:           getSalesAnalytics,
  cancellations:   getCancellationsAnalytics,
  quality:         getQualityAnalytics,
} as const;

const RESOURCE_KEYS = Object.keys(RESOURCE_MAP).join(', ');

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'query', async (filters) => {
    const resource = filters.resource;
    if (!resource || !(resource in RESOURCE_MAP)) {
      throw new Error(`Invalid resource value. Use one of: ${RESOURCE_KEYS}.`);
    }

    const resolver = RESOURCE_MAP[resource as keyof typeof RESOURCE_MAP];
    return resolver(filters);
  });
}
