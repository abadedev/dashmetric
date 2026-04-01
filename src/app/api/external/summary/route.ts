import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getSummaryAnalytics } from '@/lib/services/analytics/summary-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'summary', async (filters) => getSummaryAnalytics(filters));
}
