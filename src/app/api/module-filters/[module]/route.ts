import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { getModuleFilterPayload } from '@/lib/search/filter-options-service';
import { parseModuleFilterResource } from '@/lib/search/module-filters';
import { ExternalApiRequestError } from '@/lib/api/external-query';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ module: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { response } = await requireAuth(req);
  if (response) return response;

  try {
    return await runWithWorkspace(req, async (ctx) => {
      const { module } = await context.params;
      const resource = parseModuleFilterResource(module);
      const data = await getModuleFilterPayload(resource, ctx.workspaceId);

      return NextResponse.json({
        success: true,
        ...data,
      });
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
