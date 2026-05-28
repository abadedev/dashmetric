'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { MonitoramentoItem } from '@/lib/db/infra-schema';
import {
  CITY_OPTIONS,
  CONCLUDED_STATUS,
  PROBLEMA_OPTIONS,
  SENSOR_OPTIONS,
  STATUS_OPTIONS,
} from '@/lib/monitoramento/constants';
import type { ModuleAccessLevel } from '@/lib/module-access';

interface MonitoramentoFormProps {
  open: boolean;
  onClose: () => void;
  queryKey: readonly unknown[];
  editRecord?: MonitoramentoItem | null;
  moduleAccessLevel?: ModuleAccessLevel;
}

interface MonitoramentoFormState {
  dataPostagem: string;
  areaCity: string;
  cliente: string;
  login: string;
  rede: string;
  serialMac: string;
  problema: string;
  qtdDesconexao: string;
  sensor: string;
  atendAberto: boolean;
  observacoes: string;
  solucao: string;
  dataSolucao: string;
  status: string;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitialState(editRecord?: MonitoramentoItem | null): MonitoramentoFormState {
  if (editRecord) {
    return {
      dataPostagem: editRecord.dataPostagem ?? todayIso(),
      areaCity: editRecord.areaCity ?? '',
      cliente: editRecord.cliente ?? '',
      login: editRecord.login ?? '',
      rede: editRecord.rede ?? '',
      serialMac: editRecord.serialMac ?? '',
      problema: editRecord.problema ?? '',
      qtdDesconexao: editRecord.qtdDesconexao != null ? String(editRecord.qtdDesconexao) : '',
      sensor: editRecord.sensor ?? '',
      atendAberto: editRecord.atendAberto ?? false,
      observacoes: editRecord.observacoes ?? '',
      solucao: editRecord.solucao ?? '',
      dataSolucao: editRecord.dataSolucao ?? '',
      status: editRecord.status ?? '0_aguardando_rede',
    };
  }

  return {
    dataPostagem: todayIso(),
    areaCity: '',
    cliente: '',
    login: '',
    rede: '',
    serialMac: '',
    problema: '',
    qtdDesconexao: '',
    sensor: '',
    atendAberto: false,
    observacoes: '',
    solucao: '',
    dataSolucao: '',
    status: '0_aguardando_rede',
  };
}

function normalizeSingleLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMultiline(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function MonitoramentoForm({
  open,
  onClose,
  queryKey,
  editRecord,
  moduleAccessLevel = 'none',
}: MonitoramentoFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editRecord;
  const isManage = moduleAccessLevel === 'admin';
  const isEditLocked = isEdit && !isManage;

  const [form, setForm] = useState<MonitoramentoFormState>(() => getInitialState(editRecord));
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(getInitialState(editRecord));
    setSubmitError(null);
  }, [editRecord, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.dataPostagem) throw new Error('Informe a data de postagem.');

      const payload = {
        dataPostagem: form.dataPostagem,
        areaCity: normalizeSingleLine(form.areaCity) || null,
        cliente: normalizeSingleLine(form.cliente) || null,
        login: normalizeSingleLine(form.login) || null,
        rede: normalizeSingleLine(form.rede) || null,
        serialMac: normalizeSingleLine(form.serialMac) || null,
        problema: form.problema || null,
        qtdDesconexao: form.qtdDesconexao ? Number(form.qtdDesconexao) : null,
        sensor: form.sensor || null,
        atendAberto: form.atendAberto,
        observacoes: normalizeMultiline(form.observacoes) || null,
        solucao: normalizeMultiline(form.solucao) || null,
        dataSolucao: form.dataSolucao || null,
        status: form.status || '0_aguardando_rede',
      };

      const res = await fetch(isEdit ? `/api/monitoramento/${editRecord!.id}` : '/api/monitoramento', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao salvar registro.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar registro.');
    },
  });

  function updateField<K extends keyof MonitoramentoFormState>(field: K, value: MonitoramentoFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (submitError) setSubmitError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.getAttribute('role') === 'combobox') return;

    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('input, button, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

    const index = elements.indexOf(target);
    const next = elements[index + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  const isConcluded = form.status === CONCLUDED_STATUS;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{isEdit ? 'Editar monitoramento' : 'Novo monitoramento'}</DialogTitle>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            onKeyDown={handleKeyDown}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="mon-date">Data postagem</Label>
                  <Input
                    id="mon-date"
                    type="date"
                    value={form.dataPostagem}
                    onChange={(event) => updateField('dataPostagem', event.target.value)}
                    disabled={isEditLocked}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mon-city">Área/Cidade</Label>
                  <Select value={form.areaCity || 'none'} onValueChange={(value) => updateField('areaCity', value === 'none' ? '' : value ?? '')}>
                    <SelectTrigger id="mon-city" disabled={isEditLocked}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="max-h-[40vh] overflow-y-auto">
                      <SelectItem value="none">Não informado</SelectItem>
                      {CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mon-problem">Problema | Serviço</Label>
                  <Select value={form.problema || 'none'} onValueChange={(value) => updateField('problema', value === 'none' ? '' : value ?? '')}>
                    <SelectTrigger id="mon-problem" disabled={isEditLocked}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="none">Não informado</SelectItem>
                      {PROBLEMA_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mon-sensor">Sensor</Label>
                  <Select value={form.sensor || 'none'} onValueChange={(value) => updateField('sensor', value === 'none' ? '' : value ?? '')}>
                    <SelectTrigger id="mon-sensor" disabled={isEditLocked}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="none">Não informado</SelectItem>
                      {SENSOR_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mon-client">Cliente</Label>
                  <Input
                    id="mon-client"
                    value={form.cliente}
                    onChange={(event) => updateField('cliente', event.target.value)}
                    disabled={isEditLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mon-login">Login</Label>
                  <Input
                    id="mon-login"
                    value={form.login}
                    onChange={(event) => updateField('login', event.target.value)}
                    placeholder="0512345"
                    disabled={isEditLocked}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="mon-rede">Rede</Label>
                  <Input
                    id="mon-rede"
                    value={form.rede}
                    onChange={(event) => updateField('rede', event.target.value)}
                    placeholder="CA-03.1.7"
                    disabled={isEditLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mon-serial">Serial / MAC</Label>
                  <Input
                    id="mon-serial"
                    value={form.serialMac}
                    onChange={(event) => updateField('serialMac', event.target.value)}
                    disabled={isEditLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mon-qtd">Qtd Desconexão</Label>
                  <Input
                    id="mon-qtd"
                    type="number"
                    min="0"
                    value={form.qtdDesconexao}
                    onChange={(event) => updateField('qtdDesconexao', event.target.value)}
                    disabled={isEditLocked}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="mon-status">Status</Label>
                  <Select value={form.status} onValueChange={(value) => updateField('status', value ?? '0_aguardando_rede')}>
                    <SelectTrigger id="mon-status" disabled={isEditLocked}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="min-w-[220px]">
                      {STATUS_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.atendAberto}
                    onChange={(event) => updateField('atendAberto', event.target.checked)}
                    disabled={isEditLocked}
                    className="mb-1 h-4 w-4"
                  />
                  <span>Atend. Aberto</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mon-observacoes">Observações</Label>
                <Textarea
                  id="mon-observacoes"
                  value={form.observacoes}
                  onChange={(event) => updateField('observacoes', event.target.value)}
                  disabled={isEditLocked}
                  className="min-h-24"
                />
              </div>

              {(isEdit || isConcluded) && (
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <div className="space-y-2">
                    <Label htmlFor="mon-solucao">Solução</Label>
                    <Textarea
                      id="mon-solucao"
                      value={form.solucao}
                      onChange={(event) => updateField('solucao', event.target.value)}
                      disabled={isEditLocked}
                      className="min-h-24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mon-data-solucao">Data solução</Label>
                    <Input
                      id="mon-data-solucao"
                      type="date"
                      value={form.dataSolucao}
                      onChange={(event) => updateField('dataSolucao', event.target.value)}
                      disabled={isEditLocked}
                    />
                  </div>
                </div>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || isEditLocked}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
