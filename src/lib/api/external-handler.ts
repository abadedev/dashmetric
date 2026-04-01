import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireExternalApiAuth, ExternalApiAuthError } from '@/lib/auth/external-api-auth';
import { createErrorResponse, createSuccessResponse } from './response';
import { parseExternalApiFilters, serializeAppliedFilters } from './filters';

export async function handleExternalApiRequest(
  req: NextRequest,
  handlerName: string,
  resolver: (filters: ReturnType<typeof parseExternalApiFilters>) => Promise<unknown>
) {
  let serializedFilters: Record<string, unknown> = {};

  try {
    requireExternalApiAuth(req);
    const filters = parseExternalApiFilters(req);
    serializedFilters = serializeAppliedFilters(filters);

    const data = await resolver(filters);
    return createSuccessResponse(data, serializedFilters, { handler: handlerName });
  } catch (error) {
    if (error instanceof ExternalApiAuthError) {
      return createErrorResponse(error.status, { code: error.code, message: error.message }, serializedFilters, {
        handler: handlerName,
      });
    }

    if (error instanceof ZodError) {
      return createErrorResponse(
        400,
        {
          code: 'invalid_query_params',
          message: 'Invalid query params.',
          details: error.flatten(),
        },
        serializedFilters,
        { handler: handlerName }
      );
    }

    if (error instanceof Error && /Invalid|cannot be greater/.test(error.message)) {
      return createErrorResponse(
        400,
        {
          code: 'invalid_query_params',
          message: error.message,
        },
        serializedFilters,
        { handler: handlerName }
      );
    }

    console.error(`[external-api:${handlerName}]`, error);
    return createErrorResponse(
      500,
      {
        code: 'internal_server_error',
        message: 'Internal server error.',
      },
      serializedFilters,
      { handler: handlerName }
    );
  }
}
