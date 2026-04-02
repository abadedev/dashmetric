import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessageItem } from './chat-types';

interface ChatMessageProps {
  message: ChatMessageItem;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'number'; value: string };

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] };

function splitNumberSegments(text: string): Segment[] {
  const regex = /(\b\d[\d.,:/-]*\s?(?:%|h|min|s|MB|GB|TB)?\b)/g;
  const parts = text.split(regex).filter(Boolean);

  return parts.map((part) =>
    /^\d/.test(part.trimStart()) ? { type: 'number', value: part } : { type: 'text', value: part }
  );
}

function buildBlocks(content: string): Block[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim();
    if (!line) {
      index += 1;
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(line);
    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(line);

    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index]?.trim();
        if (!current) {
          index += 1;
          break;
        }

        const match = ordered
          ? /^\d+[.)]\s+(.+)$/.exec(current)
          : /^[-*]\s+(.+)$/.exec(current);

        if (!match) {
          break;
        }

        items.push(match[1]);
        index += 1;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index]?.trim();
      if (!current) {
        index += 1;
        break;
      }
      if (/^[-*]\s+/.test(current) || /^\d+[.)]\s+/.test(current)) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }

    blocks.push({ type: 'paragraph', lines: paragraphLines });
  }

  return blocks;
}

function renderInline(text: string) {
  return splitNumberSegments(text).map((segment, index) =>
    segment.type === 'number' ? (
      <strong key={`${segment.value}-${index}`} className="font-semibold text-foreground">
        {segment.value}
      </strong>
    ) : (
      <span key={`${segment.value}-${index}`}>{segment.value}</span>
    )
  );
}

function AssistantContent({ content }: { content: string }) {
  const blocks = buildBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={`list-${index}`}
              className={cn(
                'space-y-2 pl-5',
                block.ordered ? 'list-decimal marker:text-primary' : 'list-disc marker:text-primary'
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="pl-1 text-foreground">
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="whitespace-pre-wrap text-foreground/95">
            {block.lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {renderInline(line)}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[80%]',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border/70 bg-card'
        )}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Dashiel</span>
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        ) : (
          <AssistantContent content={message.content} />
        )}
      </div>
    </div>
  );
}
