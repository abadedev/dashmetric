import { BitrixYesNo } from './types';

interface BitrixApiEnvelope<T> {
  result?: T;
  total?: number;
  next?: number;
  error?: string;
  error_description?: string;
}

export class BitrixApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'BitrixApiError';
    this.status = options?.status ?? 500;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function getBitrixWebhookUrl() {
  const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new BitrixApiError('BITRIX24_WEBHOOK_URL não configurado.', {
      status: 500,
      code: 'BITRIX_WEBHOOK_MISSING',
    });
  }

  return webhookUrl.endsWith('/') ? webhookUrl : `${webhookUrl}/`;
}

export function getBitrixDefaultDialogId() {
  return process.env.BITRIX24_DEFAULT_DIALOG_ID ?? process.env.BITRIX24_DIALOG_ID ?? null;
}

export function normalizeBitrixFlag(value: string | null, fallback: BitrixYesNo = 'N'): BitrixYesNo {
  return value === 'Y' || value === 'N' ? value : fallback;
}

export function toBitrixErrorResponse(error: unknown) {
  if (error instanceof BitrixApiError) {
    return {
      status: error.status,
      body: {
        ok: false as const,
        error: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false as const,
      error: 'Erro inesperado ao comunicar com o Bitrix24.',
      code: 'BITRIX_UNKNOWN_ERROR',
    },
  };
}

export async function callBitrix<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<BitrixApiEnvelope<T>> {
  const response = await fetch(`${getBitrixWebhookUrl()}${method}.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const rawText = await response.text();
  let data: BitrixApiEnvelope<T> | null = null;

  try {
    data = rawText ? (JSON.parse(rawText) as BitrixApiEnvelope<T>) : null;
  } catch {
    throw new BitrixApiError('Resposta inválida do Bitrix24.', {
      status: 502,
      code: 'BITRIX_INVALID_JSON',
      details: rawText,
    });
  }

  if (!response.ok) {
    throw new BitrixApiError(
      data?.error_description || data?.error || 'Falha na requisição ao Bitrix24.',
      {
        status: response.status,
        code: data?.error || 'BITRIX_HTTP_ERROR',
        details: data,
      }
    );
  }

  if (!data) {
    throw new BitrixApiError('Resposta vazia do Bitrix24.', {
      status: 502,
      code: 'BITRIX_EMPTY_RESPONSE',
    });
  }

  if (data.error) {
    throw new BitrixApiError(data.error_description || data.error, {
      status: 502,
      code: data.error,
      details: data,
    });
  }

  return data;
}
