'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { ACTIVITY_LABELS } from '@/lib/services/sla-engine';


interface FiltersProps {
  filters: any;
  onFilterChange: (filters: any) => void;
}

export function Filters({ filters, onFilterChange }: FiltersProps) {
  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? '' : value });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 w-full">
      <div className="relative w-full md:w-64">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por Nº OS..."
          className="pl-8"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>



      <Select value={filters.type || 'all'} onValueChange={(v) => handleChange('type', v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo de Atividade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.slaStatus || 'all'} onValueChange={(v) => handleChange('slaStatus', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status da Meta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="ok">No Prazo (OK)</SelectItem>
          <SelectItem value="nok">Atrasado (NOK)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
