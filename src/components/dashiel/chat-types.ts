export type ChatRole = 'user' | 'assistant';

export type ChatMessageItem = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};
