import { NextRequest, NextResponse } from 'next/server';
import { callBitrix, getBitrixDefaultDialogId, toBitrixErrorResponse } from '@/lib/bitrix/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      dialogId?: string;
    };
    const message = body.message?.trim() ?? '';
    const finalDialogId = body.dialogId?.trim() || getBitrixDefaultDialogId();

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A mensagem não pode estar vazia.',
          code: 'MESSAGE_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (!finalDialogId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Nenhum dialogId informado e BITRIX24_DEFAULT_DIALOG_ID não está configurado.',
          code: 'DIALOG_ID_REQUIRED',
        },
        { status: 400 }
      );
    }

    const data = await callBitrix<number>('im.message.add', {
      DIALOG_ID: finalDialogId,
      MESSAGE: message,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[bitrix/send-message]', error);
    const { status, body } = toBitrixErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
