import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { buildAssistantReply } from '@/lib/ai/assistant';

export const runtime = 'nodejs';

type AssistantRequest = {
  message?: string;
};

export async function POST(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'dashboard.view', {
    moduleSlug: 'dashboard',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const body = (await req.json()) as AssistantRequest;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensagem invalida.' }, { status: 400 });
    }

    const assistantResult = await buildAssistantReply(message);

    return NextResponse.json({
      success: true,
      answer: assistantResult.answer,
      suggestions: assistantResult.suggestions,
      insightCards: assistantResult.insightCards,
    });
  } catch (error) {
    console.error('[dashiel]', error);
    return NextResponse.json(
      { success: false, error: 'Nao foi possivel gerar a analise com dados reais.' },
      { status: 500 }
    );
  }
}
