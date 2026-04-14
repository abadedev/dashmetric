'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MODULE_TABLE_MAP = [
  {
    key: 'atendimentos',
    label: 'Atendimentos',
    description: 'Tabela: atendimentos. Apaga todas as OS importadas.',
  },
  {
    key: 'qualidade',
    label: 'Qualidade & Reclamações',
    description: 'Tabela: qualidade_indicators. Apaga todos os indicadores de qualidade.',
  },
  {
    key: 'suporte',
    label: 'Suporte Técnico',
    description: 'Tabela: support_records + support_call_categories. Apaga registros de suporte.',
  },
  {
    key: 'vendas',
    label: 'Vendas',
    description: 'Tabela: sales_records. Apaga todos os registros de vendas.',
  },
  {
    key: 'cancelamentos',
    label: 'Cancelamentos',
    description: 'Tabela: cancellation_records. Apaga todos os registros de cancelamento.',
  },
  {
    key: 'infraestrutura',
    label: 'Infraestrutura',
    description: 'Tabela: service_listings (Square Cloud) + infrastructure_records (NeonDB). Apaga todos os registros de infraestrutura.',
  },
  {
    key: 'listagem-servicos',
    label: 'Listagem de Serviços',
    description: 'Tabela: service_listings (Square Cloud). Apaga todos os serviços da listagem operacional.',
  },
  {
    key: 'lotes',
    label: 'Lotes de Importação',
    description: 'Tabela: lotes_importacao + importacoes_brutas. Apaga o histórico de importações.',
  },
] as const;

type ModuleKey = (typeof MODULE_TABLE_MAP)[number]['key'];

export function DataCleanupManager() {
  const [pendingModule, setPendingModule] = useState<ModuleKey | null>(null);
  const [loadingModule, setLoadingModule] = useState<ModuleKey | null>(null);

  async function handleConfirm() {
    if (!pendingModule) return;
    const key = pendingModule;
    setPendingModule(null);
    setLoadingModule(key);

    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: key }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Erro ao limpar dados.');
      } else {
        const mod = MODULE_TABLE_MAP.find((m) => m.key === key);
        toast.success(`Dados de "${mod?.label}" apagados com sucesso.`);
      }
    } catch {
      toast.error('Erro de conexão ao limpar dados.');
    } finally {
      setLoadingModule(null);
    }
  }

  const pendingModuleLabel = MODULE_TABLE_MAP.find((m) => m.key === pendingModule)?.label ?? '';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_TABLE_MAP.map((mod) => (
          <Card key={mod.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{mod.label}</CardTitle>
              <CardDescription className="text-xs">{mod.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                disabled={loadingModule === mod.key}
                onClick={() => setPendingModule(mod.key)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {loadingModule === mod.key ? 'Limpando...' : 'Limpar dados'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={pendingModule !== null} onOpenChange={(open) => { if (!open) setPendingModule(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Tem certeza?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível e apagará todos os dados do módulo{' '}
              <strong>{pendingModuleLabel}</strong>. Os dados importados serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={handleConfirm}>
              Sim, limpar dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
