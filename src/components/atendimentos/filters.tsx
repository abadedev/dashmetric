'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const TIPO_OPTIONS = [
  { value: 'instalacao_nova', label: 'Instalação Nova' },
  { value: 'instalacao_reativacao', label: 'Instalação Reativação' },
  { value: 'reparo', label: 'Reparo' },
  { value: 'mudanca_endereco', label: 'Mudança de Endereço' },
  { value: 'retirada_kit', label: 'Retirada de Kit' },
  { value: 'mudanca_plano', label: 'Mudança de Plano' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'atendimento_interno', label: 'Atendimento Interno' },
];

interface FiltersProps {
  filters: AtendimentoFilters;
  onFilterChange: (filters: AtendimentoFilters) => void;
  options?: {
    city?: string[];
    plan?: string[];
    bairro?: string[];
  };
}

export type AtendimentoFilters = {
  type: string;
  slaStatus: string;
  search: string;
  city: string;
  plan: string;
  bairro: string;
};

export function Filters({ filters, onFilterChange, options }: FiltersProps) {
  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? '' : value });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1 md:flex-none md:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por OS, cliente ou endereço..."
          className="pl-8 h-9 text-sm"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      {/* City */}
      <Input
        placeholder="Cidade"
        className="h-9 text-sm w-32"
        list="attendance-city-options"
        value={filters.city || ''}
        onChange={(e) => handleChange('city', e.target.value)}
      />
      <datalist id="attendance-city-options">
        {(options?.city || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* Plan */}
      <Input
        placeholder="Plano"
        className="h-9 text-sm w-28"
        list="attendance-plan-options"
        value={filters.plan || ''}
        onChange={(e) => handleChange('plan', e.target.value)}
      />
      <datalist id="attendance-plan-options">
        {(options?.plan || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* Bairro */}
      <Input
        placeholder="Bairro"
        className="h-9 text-sm w-28"
        list="attendance-bairro-options"
        value={filters.bairro || ''}
        onChange={(e) => handleChange('bairro', e.target.value)}
      />
      <datalist id="attendance-bairro-options">
        {(options?.bairro || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* Activity type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</label>
        <Select
          value={filters.type || 'all'}
          onValueChange={(value) => handleChange('type', value ?? 'all')}
        >
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TIPO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* SLA status */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SLA</label>
        <Select
          value={filters.slaStatus || 'all'}
          onValueChange={(value) => handleChange('slaStatus', value ?? 'all')}
        >
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue>{(v: string | null) => v === 'all' || !v ? 'Todos' : v === 'ok' ? 'No prazo (OK)' : 'Atrasado (NOK)'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ok">No prazo (OK)</SelectItem>
            <SelectItem value="nok">Atrasado (NOK)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
