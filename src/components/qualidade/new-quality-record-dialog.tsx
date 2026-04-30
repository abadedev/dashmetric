'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewQualityRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  indicator: string;
  technicianName: string;
  clientName: string;
  city: string;
  plan: string;
  reason: string;
  osNumber: string;
  openedAt: string;
}

const EMPTY_FORM: FormState = {
  indicator: '',
  technicianName: '',
  clientName: '',
  city: '',
  plan: '',
  reason: '',
  osNumber: '',
  openedAt: new Date().toISOString().slice(0, 10),
};

export function NewQualityRecordDialog({ open, onClose, onSuccess }: NewQualityRecordDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  async function handleSubmit() {
    if (!form.indicator) {
      toast.error('Selecione o indicador.');
      return;
    }
    if (!form.technicianName.trim()) {
      toast.error('Nome do técnico é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/quality-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicator: form.indicator,
          technicianName: form.technicianName,
          clientName: form.clientName || undefined,
          city: form.city || undefined,
          plan: form.plan || undefined,
          reason: form.reason || undefined,
          osNumber: form.osNumber || undefined,
          openedAt: form.openedAt ? new Date(form.openedAt).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? 'Erro ao salvar registro.');
        return;
      }

      toast.success('Registro criado com sucesso.');
      handleClose();
      onSuccess();
    } catch {
      toast.error('Erro de conexão ao salvar registro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Registro de Qualidade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Indicador *</Label>
            <Select value={form.indicator} onValueChange={(v) => set('indicator', v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o indicador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IQIv">IQIv (Reparo após Instalação)</SelectItem>
                <SelectItem value="IQRv">IQRv (Reparo Reincidente)</SelectItem>
                <SelectItem value="ICT">ICT (Inviabilidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Técnico *</Label>
            <Input
              value={form.technicianName}
              onChange={(e) => set('technicianName', e.target.value)}
              placeholder="Nome do técnico"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Input
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Cidade</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Cidade"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Plano</Label>
              <Input
                value={form.plan}
                onChange={(e) => set('plan', e.target.value)}
                placeholder="Plano do cliente"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Login</Label>
              <Input
                value={form.osNumber}
                onChange={(e) => set('osNumber', e.target.value)}
                placeholder="Login do cliente"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Motivo</Label>
            <Input
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Motivo do registro"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Data de Abertura</Label>
            <Input
              type="date"
              value={form.openedAt}
              onChange={(e) => set('openedAt', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
