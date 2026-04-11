'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, MessageSquare, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ServiceListing } from '@/lib/db/infra-schema';
import { buildInfraDispatchMessage } from '@/lib/listagem-servicos/infra-occurrences';
import { BitrixChatPicker } from './bitrix-chat-picker';

interface ShareOsMessageButtonProps {
  record: ServiceListing;
}

export function ShareOsMessageButton({ record }: ShareOsMessageButtonProps) {
  const [copied, setCopied] = useState(false);
  const [bitrixOpen, setBitrixOpen] = useState(false);
  const textoCompartilhamento = useMemo(() => buildInfraDispatchMessage(record), [record]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textoCompartilhamento);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          title="Compartilhar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Compartilhar OS"
        >
          <Share2 className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhamento)}`, '_blank', 'noopener,noreferrer')}
          >
            <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />
            WhatsApp
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? 'Copiado!' : 'Copiar mensagem'}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setBitrixOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4 text-blue-500" />
            Bitrix24
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BitrixChatPicker
        open={bitrixOpen}
        onClose={() => setBitrixOpen(false)}
        message={textoCompartilhamento}
      />
    </>
  );
}
