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
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';

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
    <div className="flex w-full flex-wrap items-center gap-4">
      <div className="relative w-full md:w-64">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por OS, cliente ou endereco..."
          className="pl-8"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      <Input
        placeholder="Cidade"
        className="w-full md:w-40"
        list="attendance-city-options"
        value={filters.city || ''}
        onChange={(e) => handleChange('city', e.target.value)}
      />
      <datalist id="attendance-city-options">
        {(options?.city || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      <Input
        placeholder="Plano"
        className="w-full md:w-40"
        list="attendance-plan-options"
        value={filters.plan || ''}
        onChange={(e) => handleChange('plan', e.target.value)}
      />
      <datalist id="attendance-plan-options">
        {(options?.plan || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      <Input
        placeholder="Bairro"
        className="w-full md:w-36"
        list="attendance-bairro-options"
        value={filters.bairro || ''}
        onChange={(e) => handleChange('bairro', e.target.value)}
      />
      <datalist id="attendance-bairro-options">
        {(options?.bairro || []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      <Select value={filters.type || 'all'} onValueChange={(value) => handleChange('type', value ?? 'all')}>
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Tipo de atividade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.slaStatus || 'all'} onValueChange={(value) => handleChange('slaStatus', value ?? 'all')}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status da meta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="ok">No prazo (OK)</SelectItem>
          <SelectItem value="nok">Atrasado (NOK)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
