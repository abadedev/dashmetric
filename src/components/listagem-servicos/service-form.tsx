'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ServiceListing } from '@/lib/db/infra-schema';
import { INFRA_OCCURRENCE_OPTIONS } from '@/lib/listagem-servicos/infra-occurrences';
import type { ModuleAccessLevel } from '@/lib/module-access';

interface ServiceFormProps {
  open: boolean;
  onClose: () => void;
  queryKey: readonly unknown[];
  editRecord?: ServiceListing | null;
  moduleAccessLevel?: ModuleAccessLevel;
}

interface ServiceFormState {
  referenceDate: string;
  priority: string;
  cityArea: string;
  address: string;
  locationUrl: string;
  networkBox: string;
  tipoOcorrencia: string;
  observacaoInfra: string;
  status: string;
  solicitante: string;
}

const SOLICITANTE_OPTIONS = [
  'Juscelino - Itamaraju',
  'Robson Lima - Itamaraju',
  'Anilson - Teixeira de Freitas',
  'Diego - Teixeira de Freitas',
  'Elvis - Teixeira de Freitas',
  'Ian - Teixeira de Freitas',
  'Jhonata - Teixeira de Freitas',
  'José Antônio - Teixeira de Freitas',
  'Levi - Teixeira de Freitas',
  'Mateus Figueira - Teixeira de Freitas',
  'Matheus - Teixeira de Freitas',
  'Romário - Teixeira de Freitas',
  'Robson Lopes - Teixeira de Freitas',
  'Rogério - Teixeira de Freitas',
  'Mauro - Alcobaça',
  'Franklin - Alcobaça',
  'Bruno - Caravelas',
  'Anthony - Caravelas',
  'Samuel - Cumuruxatiba',
  'Jonatas Chaves - Posto da Mata',
  'Lucas - Prado',
  'Outros',
] as const;

const LAST_CITY_KEY = 'listagem-servicos:last-city-area';
const RECENT_ADDRESSES_KEY = 'listagem-servicos:recent-addresses';
const RECENT_NETWORK_BOXES_KEY = 'listagem-servicos:recent-network-boxes';

const CITY_OPTIONS = [
  'Alcobaça',
  'Aparaju',
  'Barra de Caravelas',
  'Bela Vista - Nova Viçosa',
  'Canta Galo - Alcobaça',
  'Caravelas',
  'Caxanga',
  'Cumuruxatiba - Prado',
  'Duque de Caxias - Teixeira de Freitas',
  'Guarani - Prado',
  'Guaratiba - Prado',
  'Itabatã - Mucuri',
  'Itamaraju',
  'Juerana - Caravelas',
  'Ponta de Areia - Caravelas',
  'Posto da Mata - Nova Viçosa',
  'Prado',
  'Rancho Alegre - Caravelas',
  'Santo Antonio - Teixeira de Freitas',
  'São José - Alcobaça',
  'Taquari - Alcobaça',
  'Teixeira de Freitas',
] as const;

const PRIORITY_LABELS: Record<string, string> = {
  '1': '1 (Alta)',
  '2': '2 (Média)',
  '-': '- (Baixa)',
};

const STATUSES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'tecnico_direcionado', label: 'T\u00E9cnico direcionado' },
  { value: 'em_monitoramento', label: 'Em monitoramento' },
  { value: 'nao_resolvido', label: 'N\u00E3o resolvido' },
  { value: 'resolvido', label: 'Resolvido' },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readStorage(key: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) ?? '';
}

function readRecentValues(key: string) {
  if (typeof window === 'undefined') return [] as string[];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentValue(key: string, value: string) {
  if (typeof window === 'undefined' || !value) return;

  const trimmed = value.trim();
  if (!trimmed) return;

  const next = [trimmed, ...readRecentValues(key).filter((item) => item !== trimmed)].slice(0, 8);
  window.localStorage.setItem(key, JSON.stringify(next));
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

function isGoogleMapsUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname.includes('google.') || hostname === 'maps.app.goo.gl';
  } catch {
    return false;
  }
}

function getInitialState(editRecord?: ServiceListing | null): ServiceFormState {
  if (editRecord) {
    return {
      referenceDate: editRecord.referenceDate ?? todayIso(),
      priority: editRecord.priority ?? '',
      cityArea: editRecord.cityArea ?? '',
      address: editRecord.address ?? '',
      locationUrl: editRecord.locationUrl ?? '',
      networkBox: editRecord.networkBox ?? '',
      tipoOcorrencia: editRecord.tipoOcorrencia ?? '',
      observacaoInfra: editRecord.observacaoInfra ?? editRecord.problem ?? '',
      status: editRecord.status ?? 'pendente',
      solicitante: editRecord.solicitante ?? '',
    };
  }

  return {
    referenceDate: todayIso(),
    priority: '',
    cityArea: readStorage(LAST_CITY_KEY),
    address: '',
    locationUrl: '',
    networkBox: '',
    tipoOcorrencia: '',
    observacaoInfra: '',
    status: 'pendente',
    solicitante: '',
  };
}

export function ServiceForm({ open, onClose, queryKey, editRecord, moduleAccessLevel = 'none' }: ServiceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editRecord;

  const [form, setForm] = useState<ServiceFormState>(() => getInitialState(editRecord));
  const [fotoUrl, setFotoUrl] = useState<string | null>(editRecord?.fotoUrl ?? null);
  const [solicitanteOutros, setSolicitanteOutros] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflito, setConflito] = useState<string | null>(null);

  const recentAddresses = useMemo(() => readRecentValues(RECENT_ADDRESSES_KEY), [open]);
  const recentNetworkBoxes = useMemo(() => readRecentValues(RECENT_NETWORK_BOXES_KEY), [open]);

  // Fetch all options
  const { data: dropdownOptionsData } = useQuery({
    queryKey: ['dropdown-options', 'service-form-all'],
    queryFn: async () => {
      const res = await fetch('/api/dropdown-options');
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{ data: { category: string; value: string; label: string; sortOrder: number }[] }>;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const occurrenceOptionsPairs = useMemo(() => {
    const map = new Map<string, { value: string; label: string; isStandard: boolean }>();
    INFRA_OCCURRENCE_OPTIONS.forEach(opt => map.set(opt, { value: opt, label: opt, isStandard: true }));
    if (dropdownOptionsData?.data) {
      dropdownOptionsData.data.filter(o => o.category === 'occurrence_types').forEach(opt => {
        map.set(opt.value, { value: opt.value, label: opt.label, isStandard: false });
      });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [dropdownOptionsData]);

  const cityOptionsPairs = useMemo(() => {
    const map = new Map<string, { value: string; label: string; isStandard: boolean }>();
    CITY_OPTIONS.forEach(opt => map.set(opt, { value: opt, label: opt, isStandard: true }));
    if (dropdownOptionsData?.data) {
      dropdownOptionsData.data.filter(o => o.category === 'city_areas').forEach(opt => {
        map.set(opt.value, { value: opt.value, label: opt.label, isStandard: false });
      });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [dropdownOptionsData]);

  const solicitanteOptionsPairs = useMemo(() => {
    const map = new Map<string, { value: string; label: string; isStandard: boolean }>();
    SOLICITANTE_OPTIONS.forEach(opt => map.set(opt, { value: opt, label: opt, isStandard: true }));
    if (dropdownOptionsData?.data) {
      dropdownOptionsData.data.filter(o => o.category === 'solicitantes').forEach(opt => {
        map.set(opt.value, { value: opt.value, label: opt.label, isStandard: false });
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      // Keep "Outros" at the bottom
      if (a.value === 'Outros') return 1;
      if (b.value === 'Outros') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [dropdownOptionsData]);

  useEffect(() => {
    if (!open) return;

    setForm(getInitialState(editRecord));
    setFotoUrl(editRecord?.fotoUrl ?? null);
    setSolicitanteOutros('');
    setSubmitError(null);
    setConflito(null);
  }, [editRecord, open]);

  const mutation = useMutation({
    mutationFn: async (force?: boolean) => {
      const payload = {
        referenceDate: form.referenceDate,
        priority: form.priority || null,
        technology: null,
        cityArea: normalizeSingleLine(form.cityArea) || null,
        address: normalizeSingleLine(form.address) || null,
        locationUrl: form.locationUrl.trim() || null,
        networkBox: normalizeSingleLine(form.networkBox) || null,
        problem: null,
        tipoOcorrencia: form.tipoOcorrencia,
        observacaoInfra: normalizeMultiline(form.observacaoInfra) || null,
        status: form.status,
        fotoUrl: fotoUrl || null,
        solicitante: (form.solicitante === 'Outros' ? solicitanteOutros.trim() : form.solicitante) || null,
      };

      if (!payload.referenceDate) {
        throw new Error('Informe a data de refer\u00EAncia.');
      }

      if (!payload.tipoOcorrencia) {
        throw new Error('Selecione o tipo de ocorrencia.');
      }

      if (!isGoogleMapsUrl(form.locationUrl)) {
        throw new Error('Informe um link v\u00E1lido do Google Maps.');
      }

      const baseUrl = isEdit ? `/api/listagem-servicos/${editRecord!.id}` : '/api/listagem-servicos';
      const url = !isEdit && force ? `${baseUrl}?force=true` : baseUrl;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 409 && data?.conflict) {
        setConflito(data.error);
        return data;
      }

      if (!res.ok) {
        throw new Error(data?.error ?? 'Falha ao salvar o registro.');
      }

      return data;
    },
    onSuccess: (result) => {
      if (result?.conflict) return;

      const normalizedCity = normalizeSingleLine(form.cityArea);
      const normalizedAddress = normalizeSingleLine(form.address);
      const normalizedNetworkBox = normalizeSingleLine(form.networkBox);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CITY_KEY, normalizedCity);
        writeRecentValue(RECENT_ADDRESSES_KEY, normalizedAddress);
        writeRecentValue(RECENT_NETWORK_BOXES_KEY, normalizedNetworkBox);
      }

      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar o registro.');
    },
  });

  function updateField<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (submitError) setSubmitError(null);
    if (conflito) setConflito(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.getAttribute('role') === 'combobox') {
      return;
    }

    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input, button, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

    const index = elements.indexOf(target);
    const next = elements[index + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  const canOpenLocation = form.locationUrl.trim().length > 0;
  const canManage = moduleAccessLevel === 'admin';
  const isEditLocked = isEdit && !canManage;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{isEdit ? 'Editar registro' : 'Novo registro'}</DialogTitle>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitError(null);
              mutation.mutate(false);
            }}
            onKeyDown={handleKeyDown}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {conflito && (
                <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                  ⚠️ {conflito}
                  <div className="mt-1 text-xs text-yellow-400/70">
                    Verifique se é a mesma ocorrência antes de cadastrar novamente.
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-date" className="text-sm font-medium">{'Data de refer\u00EAncia'}</Label>
                  <Input
                    id="sf-date"
                    type="date"
                    value={form.referenceDate}
                    onChange={(event) => updateField('referenceDate', event.target.value)}
                    className="h-10"
                    disabled={isEditLocked}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sf-prio" className="text-sm font-medium">Prioridade</Label>
                  <Select value={form.priority || 'none'} onValueChange={(value) => { if (!isEditLocked) updateField('priority', value === 'none' ? '' : value ?? ''); }}>
                    <SelectTrigger id="sf-prio" className="h-10 w-full" disabled={isEditLocked}>
                      <SelectValue placeholder={'\u2014'}>
                        {(value: string | null) => (value && value !== 'none' ? (PRIORITY_LABELS[value] ?? value) : '\u2014')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} collisionAvoidance={{ side: 'none' }} className="min-w-[140px]">
                      <SelectItem value="none">{'\u2014'}</SelectItem>
                      <SelectItem value="1">1 (Alta)</SelectItem>
                      <SelectItem value="2">{'2 (M\u00E9dia)'}</SelectItem>
                      <SelectItem value="-">- (Baixa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sf-status" className="text-sm font-medium">Status</Label>
                  <Select value={form.status} onValueChange={(value) => { if (!isEditLocked) updateField('status', value ?? 'pendente'); }}>
                    <SelectTrigger id="sf-status" className="h-10 w-full" disabled={isEditLocked}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} collisionAvoidance={{ side: 'none' }} className="min-w-[190px]">
                      {STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-city" className="text-sm font-medium">Cidade</Label>
                <Select value={form.cityArea || 'none'} onValueChange={(value) => { if (!isEditLocked) updateField('cityArea', value === 'none' ? '' : value ?? ''); }}>
                  <SelectTrigger id="sf-city" className="h-10 w-full" disabled={isEditLocked}>
                    <SelectValue placeholder={'\u2014'} />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} collisionAvoidance={{ side: 'none' }} className="min-w-[280px] max-h-[40vh] overflow-y-auto">
                    <SelectItem value="none">{'\u2014'}</SelectItem>
                    {cityOptionsPairs.map((city) => (
                      <SelectItem key={city.value} value={city.value} className="whitespace-nowrap">{city.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-addr" className="text-sm font-medium">{'Endere\u00E7o'}</Label>
                <Input
                  id="sf-addr"
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  placeholder={'Bairro, rua, esta\u00E7\u00E3o'}
                  list="service-address-options"
                  autoComplete="off"
                  className="h-10"
                  disabled={isEditLocked}
                />
                <datalist id="service-address-options">
                  {recentAddresses.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-location-url" className="text-sm font-medium">{'Link de localiza\u00E7\u00E3o'}</Label>
                <div className="flex items-end gap-2">
                  <Input
                    id="sf-location-url"
                    value={form.locationUrl}
                    onChange={(event) => updateField('locationUrl', event.target.value)}
                    placeholder="https://maps.google.com/..."
                    autoComplete="off"
                    className="h-10"
                    disabled={isEditLocked}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    title={'Abrir localiza\u00E7\u00E3o'}
                    disabled={!canOpenLocation}
                    onClick={() => window.open(form.locationUrl.trim(), '_blank', 'noopener,noreferrer')}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-net" className="text-sm font-medium">Rede / Caixa / CA / Equipamento</Label>
                <Input
                  id="sf-net"
                  value={form.networkBox}
                  onChange={(event) => updateField('networkBox', event.target.value)}
                  placeholder={'Identifica\u00E7\u00E3o da rede/caixa'}
                  list="service-network-box-options"
                  autoComplete="off"
                  className="h-10"
                  disabled={isEditLocked}
                />
                <datalist id="service-network-box-options">
                  {recentNetworkBoxes.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label htmlFor="sf-occurrence" className="text-sm font-medium">Tipo de ocorrencia</Label>
                  <Select value={form.tipoOcorrencia} onValueChange={(value) => { if (!isEditLocked) updateField('tipoOcorrencia', value ?? ''); }}>
                    <SelectTrigger id="sf-occurrence" className="h-10 w-full" disabled={isEditLocked}>
                      <SelectValue placeholder="Selecione a ocorrencia" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} collisionAvoidance={{ side: 'none' }} className="min-w-[var(--anchor-width)] max-h-[40vh] overflow-y-auto">
                      {occurrenceOptionsPairs.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="whitespace-normal break-words pr-8">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sf-obs-main" className="text-sm font-medium">OBS:</Label>
                  {canOpenLocation && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => window.open(form.locationUrl.trim(), '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {'Abrir link de localiza\u00E7\u00E3o'}
                    </button>
                  )}
                </div>
                <textarea
                  id="sf-obs-main"
                  value={form.observacaoInfra}
                  onChange={(event) => updateField('observacaoInfra', event.target.value)}
                  rows={4}
                  placeholder="Observacao complementar opcional..."
                  className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  disabled={isEditLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-solicitante" className="text-sm font-medium">Solicitante</Label>
                <Select
                  value={form.solicitante || 'none'}
                  onValueChange={(value) => { if (!isEditLocked) updateField('solicitante', value === 'none' ? '' : value ?? ''); }}
                >
                  <SelectTrigger id="sf-solicitante" className="h-10 w-full" disabled={isEditLocked}>
                    <SelectValue placeholder="Selecione o solicitante" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} collisionAvoidance={{ side: 'none' }} className="min-w-[250px] max-h-[40vh] overflow-y-auto">
                    <SelectItem value="none">—</SelectItem>
                    {solicitanteOptionsPairs.map((sol) => (
                      <SelectItem key={sol.value} value={sol.value} className="whitespace-normal break-words pr-8">
                        {sol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.solicitante === 'Outros' && (
                  <Input
                    value={solicitanteOutros}
                    onChange={(e) => setSolicitanteOutros(e.target.value)}
                    placeholder="Nome do solicitante"
                    className="h-10"
                    disabled={isEditLocked}
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Foto / Anexo</label>
                <ImageUpload
                  value={fotoUrl}
                  onChange={setFotoUrl}
                  disabled={mutation.isPending || isEditLocked}
                />
              </div>

              {isEditLocked && (
                <p className="text-sm text-muted-foreground">
                  Apenas administradores podem editar os campos gerais deste registro.
                </p>
              )}

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              {conflito && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400 hover:border-yellow-500/60 hover:text-yellow-300"
                  disabled={mutation.isPending}
                  onClick={() => { setConflito(null); mutation.mutate(true); }}
                >
                  Cadastrar mesmo assim
                </Button>
              )}
              <Button type="submit" className="min-w-[160px]" disabled={mutation.isPending || isEditLocked}>
                {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar altera\u00E7\u00F5es' : 'Criar registro'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
