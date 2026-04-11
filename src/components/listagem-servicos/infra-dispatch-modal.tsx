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
  const message = useMemo(() => (record ? buildInfraDispatchMessage(record) : ''), [record]);

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
            {message}
          </pre>
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
