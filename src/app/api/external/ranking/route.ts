import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getRankingAnalytics } from '@/lib/services/analytics/ranking-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'ranking', async (filters) => getRankingAnalytics(filters));
}
