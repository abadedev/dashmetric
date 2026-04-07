import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const N8N_WEBHOOK_URL =
  'https://n8nabade.squareweb.app/webhook/40c22652-857b-44f9-9124-997e3d7b88d8/chat';

type N8nResponse = {
  output?: string;
  answer?: string;
  insightCards?: unknown;
  error?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { chatInput?: string; sessionId?: string; workspaceSlug?: string };
    console.log('[dashiel/chat] body recebido:', body);

    const chatInput = typeof body.chatInput === 'string' ? body.chatInput.trim() : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
    const workspaceSlug = typeof body.workspaceSlug === 'string' ? body.workspaceSlug : undefined;

    if (!workspaceSlug) {
      console.error('[dashiel/chat] workspaceSlug ausente no body');
      return NextResponse.json({ error: 'workspaceSlug ausente.' }, { status: 400 });
    }

    if (!chatInput) {
      return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
    }

    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatInput,
        ...(sessionId && { sessionId }),
        ...(workspaceSlug && { workspaceSlug }),
      }),
    });

    const data = (await upstream.json()) as N8nResponse;

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Erro no servidor de IA.' },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[dashiel/chat]', error);
    return NextResponse.json(
      { error: 'Não foi possível consultar os dados no momento.' },
      { status: 502 },
    );
  }
}
