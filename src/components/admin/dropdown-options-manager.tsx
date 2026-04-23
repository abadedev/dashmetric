'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Network,
  Pencil,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StateDisplay, TableSkeleton } from '@/components/ui/state-display';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DropdownOption = {
  id: number;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type CategoryDef = {
  key: string;
  label: string;
  description: string;
};

type ModuleDef = {
  slug: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  categories: CategoryDef[];
};

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    slug: 'listagem-servicos',
    name: 'Listagem de Serviços',
    icon: ClipboardList,
    description: 'Campos configuráveis dos formulários de serviço de campo',
    categories: [
      {
        key: 'city_areas',
        label: 'Áreas / Cidades',
        description: 'Localizações exibidas no campo de cidade/área do formulário',
      },
      {
        key: 'occurrence_types',
        label: 'Tipos de Ocorrência',
        description: 'Categorias disponíveis para classificação de ocorrências',
      },
      {
        key: 'solicitantes',
        label: 'Solicitantes',
        description: 'Responsáveis que podem abrir chamados de serviço',
      },
      {
        key: 'tecnicos',
        label: 'Técnicos',
        description: 'Técnicos disponíveis para finalização de serviços',
      },
      {
        key: 'priorities',
        label: 'Prioridades',
        description: 'Níveis de prioridade atribuíveis aos registros',
      },
    ],
  },
  {
    slug: 'infraestrutura',
    name: 'Infraestrutura',
    icon: Network,
    description: 'Campos configuráveis dos registros de infraestrutura',
    categories: [],
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchOptions(): Promise<DropdownOption[]> {
  const res = await fetch('/api/admin/dropdown-options');
  if (!res.ok) throw new Error('Falha ao carregar opções');
  const json = (await res.json()) as { data: DropdownOption[] };
  return json.data.filter((o) => o.category !== 'cities');
}

// ─── OptionRow ────────────────────────────────────────────────────────────────

function OptionRow({
  opt,
  onToggle,
  onEdit,
  onDelete,
}: {
  opt: DropdownOption;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm',
            !opt.isActive && 'text-muted-foreground line-through'
          )}
        >
          {opt.label}
        </span>
        {opt.label !== opt.value && (
          <span className="ml-2 text-[11px] text-muted-foreground/60 font-mono">
            {opt.value}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={opt.isActive ? 'Desativar' : 'Ativar'}
          onClick={onToggle}
        >
          {opt.isActive ? (
            <ToggleRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── AddOptionInline ──────────────────────────────────────────────────────────

function AddOptionInline({
  isPending,
  onAdd,
  onCancel,
}: {
  isPending: boolean;
  onAdd: (value: string, label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim(), label.trim() || value.trim());
    setValue('');
    setLabel('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-5 py-3 bg-muted/20 border-t border-border/60"
    >
      <Input
        autoFocus
        placeholder="Valor"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        placeholder="Label (se diferente)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="h-8 text-sm"
      />
      <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!value.trim() || isPending}>
        {isPending ? 'Adicionando…' : 'Adicionar'}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  );
}

// ─── CategoryAccordion ────────────────────────────────────────────────────────

function CategoryAccordion({
  def,
  options,
  onToggle,
  onEdit,
  onDelete,
  onCreate,
  isCreating,
}: {
  def: CategoryDef;
  options: DropdownOption[];
  onToggle: (opt: DropdownOption) => void;
  onEdit: (opt: DropdownOption) => void;
  onDelete: (opt: DropdownOption) => void;
  onCreate: (category: string, value: string, label: string) => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
  );
  const activeCount = options.filter((o) => o.isActive).length;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none">{def.label}</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-none">{def.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {activeCount}/{options.length} ativas
          </span>
          <Badge variant="secondary" className="h-5 min-w-[1.5rem] px-1.5 text-xs justify-center">
            {options.length}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60">
          {sorted.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Nenhuma opção cadastrada.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {sorted.map((opt) => (
                <OptionRow
                  key={opt.id}
                  opt={opt}
                  onToggle={() => onToggle(opt)}
                  onEdit={() => onEdit(opt)}
                  onDelete={() => onDelete(opt)}
                />
              ))}
            </div>
          )}

          {adding ? (
            <AddOptionInline
              isPending={isCreating}
              onCancel={() => setAdding(false)}
              onAdd={(value, label) => {
                onCreate(def.key, value, label);
                setAdding(false);
              }}
            />
          ) : (
            <div className="px-5 py-2.5 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setAdding(true)}
              >
                <Plus className="h-3 w-3" />
                Adicionar opção
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EditDialog ───────────────────────────────────────────────────────────────

function EditDialog({
  item,
  isPending,
  onClose,
  onSave,
}: {
  item: DropdownOption;
  isPending: boolean;
  onClose: () => void;
  onSave: (label: string, sortOrder: number) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar opção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Valor interno
            </Label>
            <Input
              value={item.value}
              disabled
              className="font-mono text-sm bg-muted/50 text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Label exibido
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Ordem{' '}
              <span className="normal-case font-normal">
                (menor = primeiro)
              </span>
            </Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!label.trim() || isPending}
            onClick={() => onSave(label.trim(), Number(sortOrder) || 0)}
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ModuleDetailView ─────────────────────────────────────────────────────────

function ModuleDetailView({
  module,
  options,
  isLoading,
  error,
  isCreating,
  isUpdating,
  onBack,
  onToggle,
  onDelete,
  onCreate,
  onUpdate,
}: {
  module: ModuleDef;
  options: DropdownOption[];
  isLoading: boolean;
  error: Error | null;
  isCreating: boolean;
  isUpdating: boolean;
  onBack: () => void;
  onToggle: (opt: DropdownOption) => void;
  onDelete: (opt: DropdownOption) => void;
  onCreate: (category: string, value: string, label: string) => void;
  onUpdate: (id: number, label: string, sortOrder: number) => void;
}) {
  const [editItem, setEditItem] = useState<DropdownOption | null>(null);
  const ModuleIcon = module.icon;

  const moduleOptions = options.filter((o) =>
    module.categories.some((c) => c.key === o.category)
  );
  const totalOptions = moduleOptions.length;
  const activeOptions = moduleOptions.filter((o) => o.isActive).length;

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <StateDisplay
        variant="error"
        description="Não foi possível carregar as opções deste módulo."
      />
    );

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Todos os módulos
        </Button>
      </div>

      {/* Module header */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
          <ModuleIcon className="h-5 w-5 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold leading-tight">{module.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{module.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              {module.categories.length} categorias
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground">
              {activeOptions} de {totalOptions} opções ativas
            </span>
          </div>
        </div>
      </div>

      {/* Categories */}
      {module.categories.length === 0 ? (
        <StateDisplay
          variant="empty"
          title="Sem categorias configuradas"
          description="Este módulo ainda não possui campos configuráveis."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {module.categories.map((cat) => (
            <CategoryAccordion
              key={cat.key}
              def={cat}
              options={options.filter((o) => o.category === cat.key)}
              onToggle={onToggle}
              onEdit={setEditItem}
              onDelete={onDelete}
              onCreate={onCreate}
              isCreating={isCreating}
            />
          ))}
        </div>
      )}

      {editItem && (
        <EditDialog
          item={editItem}
          isPending={isUpdating}
          onClose={() => setEditItem(null)}
          onSave={(label, sortOrder) => {
            onUpdate(editItem.id, label, sortOrder);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

// ─── ModuleCard ───────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  options,
  onClick,
}: {
  module: ModuleDef;
  options: DropdownOption[];
  onClick: () => void;
}) {
  const ModuleIcon = module.icon;
  const isConfigured = module.categories.length > 0;
  const totalOptions = module.categories.reduce(
    (sum, c) => sum + options.filter((o) => o.category === c.key).length,
    0
  );

  return (
    <button
      type="button"
      onClick={isConfigured ? onClick : undefined}
      disabled={!isConfigured}
      className={cn(
        'group w-full text-left rounded-xl border border-border p-5 transition-all duration-150',
        isConfigured
          ? 'hover:border-border hover:bg-muted/30 hover:shadow-sm cursor-pointer'
          : 'opacity-40 cursor-default'
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
          <ModuleIcon className="h-5 w-5 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{module.name}</p>
            {isConfigured ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Em breve
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {module.description}
          </p>

          {isConfigured && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {module.categories.map((cat) => {
                const count = options.filter((o) => o.category === cat.key).length;
                return (
                  <span
                    key={cat.key}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {cat.label}
                    <span className="font-semibold text-foreground/60">{count}</span>
                  </span>
                );
              })}
            </div>
          )}

          {isConfigured && (
            <p className="mt-2.5 text-[11px] text-muted-foreground/60">
              {totalOptions} opções configuradas
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DropdownOptionsManager() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<ModuleDef | null>(null);

  const { data: options = [], isLoading, error } = useQuery({
    queryKey: ['admin-dropdown-options'],
    queryFn: fetchOptions,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { category: string; value: string; label: string }) => {
      const res = await fetch('/api/admin/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sortOrder: 0 }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? 'Erro ao criar opção');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropdown-options'] });
      toast.success('Opção adicionada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      label?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const { id, ...body } = payload;
      const res = await fetch(`/api/admin/dropdown-options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropdown-options'] });
      toast.success('Opção atualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/dropdown-options/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropdown-options'] });
      toast.success('Opção removida');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleToggle(opt: DropdownOption) {
    updateMutation.mutate({ id: opt.id, isActive: !opt.isActive });
  }

  function handleDelete(opt: DropdownOption) {
    if (!confirm(`Remover "${opt.label}"?`)) return;
    deleteMutation.mutate(opt.id);
  }

  function handleCreate(category: string, value: string, label: string) {
    createMutation.mutate({ category, value, label });
  }

  function handleUpdate(id: number, label: string, sortOrder: number) {
    updateMutation.mutate({ id, label, sortOrder });
  }

  // ── Module detail ──
  if (selectedModule) {
    return (
      <ModuleDetailView
        module={selectedModule}
        options={options}
        isLoading={isLoading}
        error={error}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        onBack={() => setSelectedModule(null)}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    );
  }

  // ── Module selection ──
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Selecione um módulo para configurar seus campos de seleção.
      </p>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 rounded-xl border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <StateDisplay variant="error" description="Não foi possível carregar os módulos." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULE_DEFINITIONS.map((module) => (
            <ModuleCard
              key={module.slug}
              module={module}
              options={options}
              onClick={() => setSelectedModule(module)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
