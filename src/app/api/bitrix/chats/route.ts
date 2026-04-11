import { NextRequest, NextResponse } from 'next/server';
import { callBitrix, normalizeBitrixFlag, toBitrixErrorResponse } from '@/lib/bitrix/server';
import type { BitrixRecentChatItem } from '@/lib/bitrix/types';

export const runtime = 'nodejs';

interface BitrixRecentItem {
  id?: number | string;
  chat_id?: number | string;
  type?: string;
  title?: string;
  counter?: number;
  date_update?: string;
  date_last_activity?: string;
  avatar?: { url?: string | null } | string | null;
  message?: {
    date?: string;
  } | null;
  user?: {
    id?: number | string;
    name?: string;
    avatar?: string | null;
  } | null;
  chat?: {
    id?: number | string;
    name?: string;
    avatar?: string | null;
  } | null;
}

function resolveRecentDialogId(item: BitrixRecentItem) {
  if (item.type === 'user') {
    return String(item.user?.id ?? item.id ?? '');
  }

  const chatId = item.chat_id ?? item.chat?.id;
  return chatId ? `chat${chatId}` : '';
}

function resolveRecentName(item: BitrixRecentItem) {
  return item.title ?? item.chat?.name ?? item.user?.name ?? 'Sem nome';
}

function resolveRecentAvatar(item: BitrixRecentItem) {
  if (typeof item.avatar === 'string') return item.avatar || null;
  if (item.avatar?.url) return item.avatar.url;
  return item.chat?.avatar ?? item.user?.avatar ?? null;
}

function resolveRecentLastMessageDate(item: BitrixRecentItem) {
  return item.message?.date ?? item.date_update ?? item.date_last_activity ?? null;
}

function mapRecentItem(item: BitrixRecentItem): BitrixRecentChatItem | null {
  const dialogId = resolveRecentDialogId(item);

  if (!dialogId) {
    return null;
  }

  return {
    dialogId,
    name: resolveRecentName(item),
    avatar: resolveRecentAvatar(item),
    counter: typeof item.counter === 'number' ? item.counter : 0,
    lastMessageDate: resolveRecentLastMessageDate(item),
    raw: item,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lastMessageDate = searchParams.get('lastMessageDate');
    const skipOpenlines = normalizeBitrixFlag(searchParams.get('skipOpenlines'));
    const skipDialog = normalizeBitrixFlag(searchParams.get('skipDialog'));
    const skipChat = normalizeBitrixFlag(searchParams.get('skipChat'));

    const data = await callBitrix<{ items?: BitrixRecentItem[] }>('im.recent.list', {
      LAST_MESSAGE_DATE: lastMessageDate || undefined,
      SKIP_OPENLINES: skipOpenlines,
      SKIP_DIALOG: skipDialog,
      SKIP_CHAT: skipChat,
      OFFSET: 0,
      LIMIT: 50,
    });

    const items = (data.result?.items ?? [])
      .map(mapRecentItem)
      .filter((item): item is BitrixRecentChatItem => item !== null);

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: items.at(-1)?.lastMessageDate ?? null,
    });
  } catch (error) {
    console.error('[bitrix/chats]', error);
    const { status, body } = toBitrixErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
