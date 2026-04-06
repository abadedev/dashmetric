import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { getModuleFilterPayload } from '@/lib/search/filter-options-service';
import { parseModuleFilterResource } from '@/lib/search/module-filters';
import { ExternalApiRequestError } from '@/lib/api/external-query';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ module: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { module } = await context.params;

  try {
    const result = await requireWorkspacePermission(req, `${module}.view`, {
      moduleSlug: module,
      action: 'view',
      requiredRole: 'user',
    });

    if (result.response) return result.response;

    const resource = parseModuleFilterResource(module);
    const data = await getModuleFilterPayload(resource, result.context.workspaceId);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    if (error instanceof ExternalApiRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    console.error('[module-filters]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'internal_server_error',
          message: 'Internal server error.',
        },
      },
      { status: 500 }
    );
  }
}
