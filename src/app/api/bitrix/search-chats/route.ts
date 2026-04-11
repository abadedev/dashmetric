import { NextRequest, NextResponse } from 'next/server';
import { callBitrix, toBitrixErrorResponse } from '@/lib/bitrix/server';

export const runtime = 'nodejs';

interface BitrixSearchChat {
  id?: number;
  name?: string;
  avatar?: string | null;
  type?: string;
  counter?: number;
  user_counter?: number;
  message_count?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 50);
    const safeOffset = Math.max(Number.isFinite(offset) ? offset : 0, 0);

    if (query.length < 3) {
      return NextResponse.json({
        ok: true,
        items: [],
        total: 0,
        next: null,
      });
    }

    const data = await callBitrix<BitrixSearchChat[]>('im.search.chat.list', {
      FIND: query,
      OFFSET: safeOffset,
      LIMIT: limit,
    });

    const items = (data.result ?? []).map((item) => ({
      dialogId: `chat${item.id}`,
      id: item.id ?? 0,
      name: item.name ?? 'Sem nome',
      avatar: item.avatar ?? null,
      type: item.type ?? 'chat',
      counter: item.counter ?? 0,
      userCounter: item.user_counter ?? 0,
      messageCount: item.message_count ?? 0,
    }));
    const total = typeof data.total === 'number' ? data.total : items.length;
    const next = typeof data.next === 'number'
      ? data.next
      : safeOffset + items.length < total
        ? safeOffset + items.length
        : null;

    return NextResponse.json({
      ok: true,
      items,
      total,
      next,
    });
  } catch (error) {
    console.error('[bitrix/search-chats]', error);
    const { status, body } = toBitrixErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
