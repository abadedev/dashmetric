import { NextResponse } from 'next/server';

type ErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

type ResponseMeta = {
  generatedAt: string;
  source: 'database' | 'cache';
} & Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)])
    );
  }

  return value;
}

function normalizeJsonRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
  const normalized = normalizeJsonValue(value ?? {});
  return isPlainObject(normalized) ? normalized : {};
}

export function createSuccessResponse(
  data: unknown,
  filters: Record<string, unknown>,
  meta: Record<string, unknown> = {},
  status = 200,
  extra: Record<string, unknown> = {},
  source: 'database' | 'cache' = 'database',
) {
  const payload = {
    success: true,
    ...normalizeJsonRecord(extra),
    data: data == null ? {} : normalizeJsonValue(data),
    meta: {
      generatedAt: new Date().toISOString(),
      source,
      ...meta,
    } satisfies ResponseMeta,
    filters: normalizeJsonRecord(filters),
    error: null,
  };

  return NextResponse.json(payload, { status });
}

export function createErrorResponse(
  status: number,
  error: ErrorPayload,
  filters: Record<string, unknown> = {},
  meta: Record<string, unknown> = {},
  extra: Record<string, unknown> = {}
) {
  const payload = {
    success: false,
    ...normalizeJsonRecord(extra),
    data: null,
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'database',
      ...meta,
    } satisfies ResponseMeta,
    filters: normalizeJsonRecord(filters),
    error: normalizeJsonValue(error),
  };

  return NextResponse.json(payload, { status });
}
