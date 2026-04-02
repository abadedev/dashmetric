import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getCancellationsAnalytics } from '@/lib/services/analytics/cancellations-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'cancellations', async (filters) => getCancellationsAnalytics(filters));
}
