export type BitrixYesNo = 'Y' | 'N';

export interface BitrixRouteErrorBody {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface BitrixRecentChatItem {
  dialogId: string;
  name: string;
  avatar: string | null;
  counter: number;
  lastMessageDate: string | null;
  raw: unknown;
}

export interface BitrixRecentChatsResponse {
  ok: true;
  items: BitrixRecentChatItem[];
  nextCursor: string | null;
}

export interface BitrixSearchChatItem {
  dialogId: string;
  id: number;
  name: string;
  avatar: string | null;
  type: string;
  counter: number;
  userCounter: number;
  messageCount: number;
}

export interface BitrixSearchChatsResponse {
  ok: true;
  items: BitrixSearchChatItem[];
  total: number;
  next: number | null;
}

export interface BitrixSendMessageSuccessResponse {
  ok: true;
  data: unknown;
}
