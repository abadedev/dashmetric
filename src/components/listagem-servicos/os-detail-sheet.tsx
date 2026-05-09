'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User, Clock, MapPin, Wifi, FileText, History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  AUDITED_FIELDS,
  FIELD_LABELS,
  formatAuditValue,
  type AuditedField,
} from '@/lib/listagem-servicos/audit-fields';
import { cn } from '@/lib/utils';

interface ServiceListingLogRow {
  id: number;
  serviceListingId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedAt: string;
}

const AUDITED_FIELD_SET = new Set<string>(AUDITED_FIELDS);

const SECTION_CARD_CLASS =
  'rounded-[12px] border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-4 py-3.5';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={SECTION_CARD_CLASS}>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-tertiary)] flex items-center gap-1.5 mb-2.5 pb-2.5 border-b-[0.5px] border-[var(--color-border-tertiary)]">
        <Icon className="w-3 h-3" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[11px] font-normal text-[var(--color-text-tertiary)]">{label}</span>
      <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{children}</div>
    </div>
  );
}

function ChangeHistorySection({ recordId }: { recordId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['listagem-servicos', recordId, 'logs'],
    queryFn: async () => {
      const res = await fetch(`/api/listagem-servicos/${recordId}/logs`);
      if (!res.ok) throw new Error('logs error');
      return res.json() as Promise<{ data: ServiceListingLogRow[] }>;
    },
  });

  const logs = data?.data ?? [];

  return (
    <Section icon={History} title="Histórico de alterações">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : isError ? (
        <div className="text-xs text-red-400">Erro ao carregar histórico.</div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-muted-foreground">Sem alterações registradas.</div>
      ) : (
        <ol className="space-y-2">
          {logs.map((log) => {
            const isAudited = AUDITED_FIELD_SET.has(log.fieldName);
            const label = isAudited
              ? FIELD_LABELS[log.fieldName as AuditedField]
              : log.fieldName;
            const oldFmt = isAudited
              ? formatAuditValue(log.fieldName as AuditedField, log.oldValue)
              : log.oldValue ?? '—';
            const newFmt = isAudited
              ? formatAuditValue(log.fieldName as AuditedField, log.newValue)
              : log.newValue ?? '—';
            return (
              <li
                key={log.id}
                className="rounded-md border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDateTime(log.changedAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] line-through text-muted-foreground">
                    {oldFmt}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground">
                    {newFmt}
                  </span>
                </div>
                {log.changedBy && (
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> {log.changedBy}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

interface OsServiceDetailSheetProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return String(value);
  }
}

export function OsServiceDetailSheet({ record, isOpen, onClose }: OsServiceDetailSheetProps) {
  if (!record) return null;

  const statusColor: Record<string, string> = {
    pendente:       'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    resolvido:      'bg-green-600/15 text-green-500 border-green-500/30',
    'em andamento': 'bg-blue-500/15 text-blue-400 border-blue-400/30',
    em_andamento:   'bg-blue-500/15 text-blue-400 border-blue-400/30',
  };

  const statusNorm = (record.status ?? '').toLowerCase();
  const badgeClass = statusColor[statusNorm] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] sm:max-w-[1080px] max-h-[90vh] overflow-y-auto sm:p-6">
        <DialogHeader className="pb-3 border-b-[0.5px] border-[var(--color-border-tertiary)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="text-[18px] font-bold">
              {record.networkBox || record.caixaRede || 'Sem caixa/rede'}
            </DialogTitle>
            <Badge variant="outline" className={badgeClass}>
              {record.status ?? '—'}
            </Badge>
          </div>
          <DialogDescription className="text-[13px] text-muted-foreground">
            {record.tipoOcorrencia || record.occurrence || record.tipo || '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">

          {/* Localização */}
          <Section icon={MapPin} title="Localização">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade / Área">{record.cityArea || record.cidade || '—'}</Field>
              <Field label="Rede / Caixa">
                <span className="font-mono text-xs">{record.networkBox || record.caixaRede || '—'}</span>
              </Field>
              <Field label="Endereço" className="col-span-2">
                {record.address || record.endereco || '—'}
              </Field>
            </div>
          </Section>

          {/* Ocorrência */}
          <Section icon={Wifi} title="Ocorrência">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo">{record.tipoOcorrencia || record.occurrence || record.tipo || '—'}</Field>
              <Field label="Status">
                <Badge variant="outline" className={badgeClass}>{record.status ?? '—'}</Badge>
              </Field>
              {(record.observacaoInfra || record.problem || record.descricao || record.observacao) && (
                <Field label="Descrição / Obs" className="col-span-2">
                  {record.observacaoInfra || record.problem || record.descricao || record.observacao}
                </Field>
              )}
              {record.solution && (
                <Field label="Solução" className="col-span-2">
                  {record.solution}
                </Field>
              )}
            </div>
          </Section>

          {/* Técnico */}
          {(record.technician || record.tecnico) && (
            <Section icon={User} title="Técnico">
              <Field label="Técnico">{record.technician || record.tecnico}</Field>
            </Section>
          )}

          {/* Solicitante */}
          {record.solicitante && (
            <Section icon={User} title="Solicitante">
              <Field label="Solicitante">{record.solicitante}</Field>
            </Section>
          )}

          {/* Registro */}
          <Section icon={FileText} title="Informações do Registro">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Adicionado em">
                {formatDateTime(record.createdAt || record.addedAt || record.dataImportacao)}
              </Field>
              <Field label="Concluído em">
                {formatDateTime(record.resolvedAt)}
              </Field>
              {(record.createdBy || record.addedByName || record.added_by_name) && (
                <Field label="Adicionado por" className="col-span-2">
                  {record.createdBy || record.addedByName || record.added_by_name}
                </Field>
              )}
            </div>
          </Section>

          {typeof record.id === 'number' && (
            <ChangeHistorySection recordId={record.id} />
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
