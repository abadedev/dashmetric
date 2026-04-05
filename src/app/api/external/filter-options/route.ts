import { NextRequest } from 'next/server';
import { handleExternalApiRequest } from '@/lib/api/external-handler';
import { getModuleFilterPayload } from '@/lib/search/filter-options-service';
import { parseModuleFilterResource } from '@/lib/search/module-filters';
import { ExternalApiRequestError } from '@/lib/api/external-query';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleExternalApiRequest(
    req,
    'filter-options',
    async (filters) => {
      const resource = parseModuleFilterResource(filters.resource);
      return getModuleFilterPayload(resource, filters.workspaceId);
    },
    {
      buildSuccessExtra: (filters) => ({
        resource: parseModuleFilterResource(filters.resource),
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
