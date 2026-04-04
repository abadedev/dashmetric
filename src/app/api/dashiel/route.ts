import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { runWithWorkspace } from '@/lib/with-workspace';
import { buildAssistantReply } from '@/lib/ai/assistant';

export const runtime = 'nodejs';

type AssistantRequest = {
  message?: string;
};

export async function POST(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) {
    return response;
  }

  return runWithWorkspace(req, async () => {
    try {
      const body = (await req.json()) as AssistantRequest;
      const message = typeof body.message === 'string' ? body.message.trim() : '';

      if (!message) {
        return NextResponse.json({ success: false, error: 'Mensagem inválida.' }, { status: 400 });
      }

      const result = await buildAssistantReply(message);

      return NextResponse.json({
        success: true,
        answer: result.answer,
        suggestions: result.suggestions,
        insightCards: result.insightCards,
      });
    } catch (error) {
      console.error('[dashiel]', error);
      return NextResponse.json(
        { success: false, error: 'Não foi possível gerar a análise com dados reais.' },
        { status: 500 }
      );
    }
  });
}
