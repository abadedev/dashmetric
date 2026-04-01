import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getSlaAnalytics } from '@/lib/services/analytics/attendance-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'sla', async (filters) => getSlaAnalytics(filters));
}
