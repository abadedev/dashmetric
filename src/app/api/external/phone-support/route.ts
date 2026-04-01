import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getPhoneSupportAnalytics } from '@/lib/services/analytics/phone-support-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(req, 'phone-support', async (filters) => getPhoneSupportAnalytics(filters));
}
