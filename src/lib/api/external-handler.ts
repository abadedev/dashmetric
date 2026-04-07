import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireExternalApiAuth, ExternalApiAuthError } from '@/lib/auth/external-api-auth';
import { ExternalApiRequestError } from './external-query';
import { createErrorResponse, createSuccessResponse } from './response';
import { parseExternalApiFilters, serializeAppliedFilters } from './filters';
import { isWorkspaceNotFoundError, resolveWorkspaceId } from '@/lib/db/workspace-context';
import { buildCacheKey, withCache } from '@/lib/cache';

export async function handleExternalApiRequest(
  req: NextRequest,
  handlerName: string,
  resolver: (filters: ReturnType<typeof parseExternalApiFilters>) => Promise<unknown>,
  options?: {
    buildSuccessExtra?: (filters: ReturnType<typeof parseExternalApiFilters>, data: unknown) => Record<string, unknown>;
    buildErrorExtra?: (filters: Record<string, unknown>, error: unknown) => Record<string, unknown>;
  }
) {
  let serializedFilters: Record<string, unknown> = {};

  try {
    requireExternalApiAuth(req);
    const filters = parseExternalApiFilters(req);

    if (!filters.workspaceSlug) {
      throw new ExternalApiRequestError(
        'O parametro "workspaceSlug" e obrigatorio para consultas multi-workspace.',
        400,
        'missing_workspace_slug'
      );
    }

    filters.workspaceId = await resolveWorkspaceId(filters.workspaceSlug);
    serializedFilters = serializeAppliedFilters(filters);

    const cacheKey = buildCacheKey(handlerName, serializedFilters as Record<string, string>);
    const { data, source } = await withCache(cacheKey, () => resolver(filters));

    return createSuccessResponse(
      data,
      serializedFilters,
      { handler: handlerName },
      200,
      options?.buildSuccessExtra?.(filters, data) ?? {},
      source,
    );
  } catch (error) {
    if (error instanceof ExternalApiAuthError) {
      return createErrorResponse(
        error.status,
        { code: error.code, message: error.message },
        serializedFilters,
        { handler: handlerName },
        options?.buildErrorExtra?.(serializedFilters, error) ?? {}
      );
    }

    if (error instanceof ExternalApiRequestError) {
      return createErrorResponse(
        error.status,
        { code: error.code, message: error.message },
        serializedFilters,
        { handler: handlerName },
        options?.buildErrorExtra?.(serializedFilters, error) ?? {}
      );
    }

    if (isWorkspaceNotFoundError(error)) {
      return createErrorResponse(
        404,
        {
          code: 'workspace_not_found',
          message: 'Workspace informado não foi encontrado.',
        },
        serializedFilters,
        { handler: handlerName },
        options?.buildErrorExtra?.(serializedFilters, error) ?? {}
      );
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
        { handler: handlerName },
        options?.buildErrorExtra?.(serializedFilters, error) ?? {}
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
        { handler: handlerName },
        options?.buildErrorExtra?.(serializedFilters, error) ?? {}
      );
    }

    console.error(`[external-api:${handlerName}]`, {
      filters: serializedFilters,
      error: error instanceof Error ? error.message : String(error),
    });
    return createErrorResponse(
      500,
      {
        code: 'internal_server_error',
        message: 'Internal server error.',
      },
      serializedFilters,
      { handler: handlerName },
      options?.buildErrorExtra?.(serializedFilters, error) ?? {}
    );
  }
}
