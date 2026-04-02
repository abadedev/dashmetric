import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

const DEFAULT_WEBHOOK_URL =
  'https://n8nabade.squareweb.app/webhook/1808fb6d-840b-4648-a42c-f56c3183f67a/chat';

type UpstreamPayload =
  | {
      response?: unknown;
      message?: unknown;
      output?: unknown;
      answer?: unknown;
      text?: unknown;
      data?: { response?: unknown; output?: unknown; text?: unknown };
    }
  | Array<{
      response?: unknown;
      message?: unknown;
      output?: unknown;
      answer?: unknown;
      text?: unknown;
      data?: { response?: unknown; output?: unknown; text?: unknown };
    }>;

function parseUpstreamError(raw: string) {
  if (!raw) {
    return 'Não foi possível obter resposta, tente novamente';
  }

  try {
    const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    return raw;
  }

  return raw;
}

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) {
    return response;
  }

  try {
    const body = (await req.json()) as { message?: unknown; sessionId?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : 'dashiel-session';

    if (!message) {
      return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
    }

    const webhookUrl = process.env.AI_CHAT_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

    const upstreamResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
      body: JSON.stringify({
        message,
        chatInput: message,
        sessionId,
        action: 'sendMessage',
      }),
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      const upstreamText = await upstreamResponse.text();
      return NextResponse.json({ error: parseUpstreamError(upstreamText) }, { status: 502 });
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    let reply = '';

    if (contentType.includes('application/json')) {
      const payload = (await upstreamResponse.json()) as UpstreamPayload;
      const normalized = Array.isArray(payload) ? payload[0] : payload;
      const candidate =
        normalized?.response ??
        normalized?.message ??
        normalized?.output ??
        normalized?.answer ??
        normalized?.text ??
        normalized?.data?.response ??
        normalized?.data?.output ??
        normalized?.data?.text;

      if (typeof candidate === 'string') {
        reply = candidate.trim();
      }
    } else {
      reply = (await upstreamResponse.text()).trim();
    }

    if (!reply) {
      return NextResponse.json(
        { error: 'Não foi possível obter resposta, tente novamente' },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: reply });
  } catch (error) {
    console.error('[ai:chat]', error);
    return NextResponse.json(
      { error: 'Não foi possível obter resposta, tente novamente' },
      { status: 500 }
    );
  }
}
