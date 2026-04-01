import { NextResponse } from 'next/server';

type ErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

type ResponseMeta = {
  generatedAt: string;
  source: 'database';
} & Record<string, unknown>;

export function createSuccessResponse(
  data: unknown,
  filters: Record<string, unknown>,
  meta: Record<string, unknown> = {},
  status = 200
) {
  const payload = {
    success: true,
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'database',
      ...meta,
    } satisfies ResponseMeta,
    filters,
    error: null,
  };

  return NextResponse.json(payload, { status });
}

export function createErrorResponse(
  status: number,
  error: ErrorPayload,
  filters: Record<string, unknown> = {},
  meta: Record<string, unknown> = {}
) {
  const payload = {
    success: false,
    data: null,
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'database',
      ...meta,
    } satisfies ResponseMeta,
    filters,
    error,
  };

  return NextResponse.json(payload, { status });
}
