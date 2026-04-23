'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const TECHNICIAN_OPTIONS = ['Marlon', 'Azevedo', 'Outros'];

type TechnicianOption = string;
type MaterialChoice = 'Sim' | 'Não' | '';

function composeResolutionNotes(materialUsed: Exclude<MaterialChoice, ''>, notes: string) {
  const trimmedNotes = notes.trim();
  return trimmedNotes ? `Usou material: ${materialUsed}\n${trimmedNotes}` : `Usou material: ${materialUsed}`;
}

export function FinalizeDialog({ record, open, onClose, queryKey }: FinalizeDialogProps) {
  const queryClient = useQueryClient();
  const [technicianOption, setTechnicianOption] = useState<TechnicianOption>('');
  const [customTechnician, setCustomTechnician] = useState('');
  const [solution, setSolution] = useState('');
  const [resolutionDate, setResolutionDate] = useState(todayIso());
  const [materialUsed, setMaterialUsed] = useState<MaterialChoice>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const technicianTriggerRef = useRef<HTMLButtonElement | null>(null);
  const customTechnicianRef = useRef<HTMLInputElement | null>(null);

  const { data: dropdownOptionsData } = useQuery({
    queryKey: ['dropdown-options', 'finalize-dialog'],
    queryFn: async () => {
      const res = await fetch('/api/dropdown-options');
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{ data: { category: string; value: string; label: string; sortOrder: number }[] }>;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const technicianOptionsPairs = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    TECHNICIAN_OPTIONS.forEach(opt => map.set(opt, { value: opt, label: opt }));
    if (dropdownOptionsData?.data) {
      dropdownOptionsData.data.filter((o: any) => o.category === 'tecnicos').forEach((opt: any) => {
        map.set(opt.value, { value: opt.value, label: opt.label });
      });
    }
    const existingTechnician = record?.technician?.trim() ?? '';
    if (existingTechnician && existingTechnician !== 'Outros' && !map.has(existingTechnician)) {
      map.set(existingTechnician, { value: existingTechnician, label: existingTechnician });
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.value === 'Outros') return 1;
      if (b.value === 'Outros') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [dropdownOptionsData, record?.technician]);

  useEffect(() => {
    if (!open) return;

    const existingTechnician = record?.technician?.trim() ?? '';
    setTechnicianOption(existingTechnician);
    setCustomTechnician('');

    setSolution(record?.solution ?? '');
    setResolutionDate(record?.resolutionDate ?? todayIso());
    setMaterialUsed('');
    setResolutionNotes('');
    setErrors({});

    const timeoutId = window.setTimeout(() => technicianTriggerRef.current?.focus(), 40);
    return () => window.clearTimeout(timeoutId);
  }, [open, record]);

  useEffect(() => {
    if (technicianOption !== 'Outros') return;
    const timeoutId = window.setTimeout(() => customTechnicianRef.current?.focus(), 40);
    return () => window.clearTimeout(timeoutId);
  }, [technicianOption]);

  function resetForm() {
    setTechnicianOption('');
    setCustomTechnician('');
    setSolution('');
    setResolutionDate(todayIso());
    setMaterialUsed('');
    setResolutionNotes('');
    setErrors({});
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    if (!technicianOption) nextErrors.technician = 'Selecione o técnico responsável.';
    if (technicianOption === 'Outros' && !customTechnician.trim()) {
      nextErrors.customTechnician = 'Informe o nome do técnico.';
    }
    if (!solution.trim()) nextErrors.solution = 'Informe a solução aplicada.';
    if (!resolutionDate) nextErrors.resolutionDate = 'Informe a data de conclusão.';
    if (!materialUsed) nextErrors.materialUsed = 'Escolha se usou material.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const finalTechnician =
        technicianOption === 'Outros' ? customTechnician.trim() : technicianOption;

      const res = await fetch(`/api/listagem-servicos/${record!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalize: true,
          technician: finalTechnician,
          solution: solution.trim(),
          resolutionDate,
          resolutionNotes: composeResolutionNotes(materialUsed as Exclude<MaterialChoice, ''>, resolutionNotes),
        }),
      });
      if (!res.ok) throw new Error('Falha ao finalizar.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
      resetForm();
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
            <Select
              value={technicianOption || null}
              onValueChange={(value) => {
                setTechnicianOption((value ?? '') as TechnicianOption);
                if (value !== 'Outros') setCustomTechnician('');
                setErrors((current) => ({ ...current, technician: '', customTechnician: '' }));
              }}
            >
              <SelectTrigger id="fin-tech" ref={technicianTriggerRef} className="w-full">
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" className="max-h-[40vh] overflow-y-auto">
                {technicianOptionsPairs.map((opt: { value: string; label: string }) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.technician && <p className="text-sm text-destructive">{errors.technician}</p>}
          </div>

          {technicianOption === 'Outros' && (
            <div className="space-y-1.5">
              <Label htmlFor="fin-tech-custom">Informe o nome do técnico</Label>
              <Input
                id="fin-tech-custom"
                ref={customTechnicianRef}
                value={customTechnician}
                onChange={(event) => {
                  setCustomTechnician(event.target.value);
                  setErrors((current) => ({ ...current, customTechnician: '' }));
                }}
                placeholder="Nome do técnico"
              />
              {errors.customTechnician && <p className="text-sm text-destructive">{errors.customTechnician}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fin-sol">{'Solu\u00E7\u00E3o aplicada'}</Label>
            <textarea
              id="fin-sol"
              value={solution}
              onChange={(event) => {
                setSolution(event.target.value);
                setErrors((current) => ({ ...current, solution: '' }));
              }}
              rows={3}
              placeholder={'Descreva a solu\u00E7\u00E3o...'}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            {errors.solution && <p className="text-sm text-destructive">{errors.solution}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fin-date">{'Data de conclus\u00E3o'}</Label>
            <Input
              id="fin-date"
              type="date"
              value={resolutionDate}
              onChange={(event) => {
                setResolutionDate(event.target.value);
                setErrors((current) => ({ ...current, resolutionDate: '' }));
              }}
            />
            {errors.resolutionDate && <p className="text-sm text-destructive">{errors.resolutionDate}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fin-material">{'Usou material?'}</Label>
            <Select
              value={materialUsed || null}
              onValueChange={(value) => {
                setMaterialUsed((value ?? '') as MaterialChoice);
                setErrors((current) => ({ ...current, materialUsed: '' }));
              }}
            >
              <SelectTrigger id="fin-material" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
            {errors.materialUsed && <p className="text-sm text-destructive">{errors.materialUsed}</p>}
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
          <Button
            onClick={() => {
              if (!validateForm()) return;
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Confirmando...' : 'Confirmar finaliza\u00E7\u00E3o'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
