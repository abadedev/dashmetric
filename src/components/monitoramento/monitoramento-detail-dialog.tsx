'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { MonitoramentoItem } from '@/lib/db/infra-schema';
import { STATUS_CONFIG } from '@/lib/monitoramento/constants';
import { cn } from '@/lib/utils';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value || '—'}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="min-h-20 whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm">
        {value?.trim() || '—'}
      </div>
    </div>
  );
}

export function MonitoramentoDetailDialog({
  record,
  open,
  onClose,
}: {
  record: MonitoramentoItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;
  const statusConfig = STATUS_CONFIG[record.status] ?? STATUS_CONFIG['0_aguardando_rede'];

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do monitoramento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            <Badge variant={record.atendAberto ? 'default' : 'outline'}>
              Atend. {record.atendAberto ? 'Sim' : 'Não'}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Data postagem" value={formatDate(record.dataPostagem)} />
            <Field label="Área/Cidade" value={record.areaCity} />
            <Field label="Problema" value={record.problema} />
            <Field label="Sensor" value={record.sensor} />
            <Field label="Qtd desconexão" value={record.qtdDesconexao != null ? record.qtdDesconexao : '—'} />
            <Field label="Data solução" value={formatDate(record.dataSolucao)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente" value={record.cliente} />
            <Field label="Login" value={record.login} />
            <Field label="Rede" value={record.rede} />
            <Field label="Serial / MAC" value={record.serialMac} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Criado por" value={record.criadoPor} />
            <Field label="Criado em" value={formatDateTime(record.createdAt)} />
            <Field label="Resolvido por" value={record.resolvidoPor} />
            <Field label="Resolvido em" value={formatDateTime(record.resolvidoAt)} />
          </div>

          <TextBlock label="Observações" value={record.observacoes} />
          <TextBlock label="Solução" value={record.solucao} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
