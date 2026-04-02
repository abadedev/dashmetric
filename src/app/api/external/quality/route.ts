import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getQualityAnalytics } from '@/lib/services/analytics/quality-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'quality', async (filters) => getQualityAnalytics(filters));
}
