import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getSalesAnalytics } from '@/lib/services/analytics/sales-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'sales', async (filters) => getSalesAnalytics(filters));
}
