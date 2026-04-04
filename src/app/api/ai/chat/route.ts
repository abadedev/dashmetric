import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { buildAssistantReply } from '@/lib/ai/assistant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) {
    return response;
  }

  return runWithWorkspace(req, async () => {
    try {
      const body = (await req.json()) as { message?: unknown };
      const message = typeof body.message === 'string' ? body.message.trim() : '';

      if (!message) {
        return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
      }

      const result = await buildAssistantReply(message);

      return NextResponse.json({ response: result.answer });
    } catch (error) {
      console.error('[ai:chat]', error);
      return NextResponse.json(
        { error: 'Não foi possível obter resposta baseada no banco.' },
        { status: 500 }
      );
    }
  });
}
