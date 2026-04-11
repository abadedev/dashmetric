'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ServiceListing } from '@/lib/db/infra-schema';

interface FinalizeDialogProps {
  record: ServiceListing | null;
  open: boolean;
  onClose: () => void;
  queryKey: readonly unknown[];
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function FinalizeDialog({ record, open, onClose, queryKey }: FinalizeDialogProps) {
  const queryClient = useQueryClient();
  const [technician, setTechnician] = useState('');
  const [solution, setSolution] = useState('');
  const [resolutionDate, setResolutionDate] = useState(todayIso());
  const [resolutionNotes, setResolutionNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/listagem-servicos/${record!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalize: true, technician, solution, resolutionDate, resolutionNotes }),
      });
      if (!res.ok) throw new Error('Falha ao finalizar.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
      setTechnician('');
      setSolution('');
      setResolutionDate(todayIso());
      setResolutionNotes('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{'Finalizar servi\u00E7o'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fin-tech">{'T\u00E9cnico respons\u00E1vel'}</Label>
            <Input
              id="fin-tech"
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
              placeholder={'Nome do t\u00E9cnico'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-sol">{'Solu\u00E7\u00E3o aplicada'}</Label>
            <textarea
              id="fin-sol"
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              rows={3}
              placeholder={'Descreva a solu\u00E7\u00E3o...'}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-date">{'Data de conclus\u00E3o'}</Label>
            <Input
              id="fin-date"
              type="date"
              value={resolutionDate}
              onChange={(event) => setResolutionDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-notes">{'Observa\u00E7\u00F5es adicionais'}</Label>
            <textarea
              id="fin-notes"
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
              rows={2}
              placeholder="Opcional..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">Falha ao finalizar. Tente novamente.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Confirmando...' : 'Confirmar finaliza\u00E7\u00E3o'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
