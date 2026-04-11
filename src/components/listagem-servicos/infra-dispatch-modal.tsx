'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ServiceListing } from '@/lib/db/infra-schema';
import { buildInfraDispatchMessage } from '@/lib/listagem-servicos/infra-occurrences';

interface InfraDispatchModalProps {
  record: ServiceListing | null;
  open: boolean;
  onClose: () => void;
}

export function InfraDispatchModal({ record, open, onClose }: InfraDispatchModalProps) {
  const [copied, setCopied] = useState(false);
  // Texto completo (com URL da foto) — usado apenas no clipboard
  const message = useMemo(() => (record ? buildInfraDispatchMessage(record) : ''), [record]);
  // Texto de exibição sem a linha da foto (renderizada separadamente como link)
  const displayMessage = useMemo(() => {
    if (!message) return '';
    return message.replace(/\n📷 Foto: .+$/, '');
  }, [message]);

  const fotoUrl = record?.fotoUrl ?? null;

  async function handleCopy() {
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada para a area de transferencia.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Nao foi possivel copiar a mensagem.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Encaminhar para Infraestrutura</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
            {displayMessage}
          </pre>
          {fotoUrl && (
            <p className="mt-2 font-sans text-sm leading-6 text-foreground">
              📷{' '}
              <a
                href={fotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Ver foto anexada
              </a>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!message}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar mensagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
