import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import {
  ExternalApiRequestError,
  parseExternalQueryResource,
  resolveExternalQueryResource,
} from '@/lib/api/external-query';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(
    req,
    'query',
    async (filters) => {
      const resource = parseExternalQueryResource(filters.resource);
      return resolveExternalQueryResource(resource, filters);
    },
    {
      buildSuccessExtra: (filters) => ({
        resource: parseExternalQueryResource(filters.resource),
      }),
      buildErrorExtra: (filters, error) => ({
        resource:
          error instanceof ExternalApiRequestError && error.code === 'missing_resource'
            ? null
            : typeof filters.resource === 'string'
              ? filters.resource.trim().toLowerCase() || null
              : null,
      }),
    }
  );
}
