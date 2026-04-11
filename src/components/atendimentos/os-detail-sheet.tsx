'use client';

import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { ACTIVITY_LABELS, formatSLATime } from '@/lib/services/sla-engine';
import {
  Clock, User, MapPin, Wrench,
  CheckCircle2, XCircle, Minus, X, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OsDetailSheetProps {
  os: any;
  isOpen: boolean;
  onClose: () => void;
}

/* ── sub-components ── */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground w-16 shrink-0 pt-0.5 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground flex-1 leading-snug">
        {value || (
          <span className="text-muted-foreground font-normal italic">Não informado</span>
        )}
      </span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3 text-muted-foreground" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SlaStatusBadge({ within }: { within: boolean | null }) {
  if (within === null || within === undefined) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Minus className="w-4 h-4 shrink-0" />
        <span className="text-sm">Sem meta</span>
      </div>
    );
  }
  return within ? (
    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">Dentro da meta</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
      <XCircle className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">Fora da meta</span>
    </div>
  );
}

function SlaBar({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped >= 70 ? 'bg-emerald-500' : clamped >= 40 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">SLA útil consumido</span>
        <span
          className={cn('text-xs font-semibold tabular-nums', {
            'text-emerald-600 dark:text-emerald-400': clamped >= 70,
            'text-amber-500': clamped >= 40 && clamped < 70,
            'text-red-500': clamped < 40,
          })}
        >
          {clamped}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ── main component ── */

export function OsDetailSheet({ os, isOpen, onClose }: OsDetailSheetProps) {
  if (!os) return null;

  const isWithin = os.withinSlaUtil;
  const label = ACTIVITY_LABELS[os.activityType] || os.activityType;
  const slaPercent =
    os.slaUtilSeconds !== null && os.slaTargetHours
      ? Math.round((os.slaUtilSeconds / (os.slaTargetHours * 3600)) * 100)
      : null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          'sm:max-w-[540px] w-full p-0 gap-0',
          'max-h-[90vh] flex flex-col overflow-hidden',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                OS {os.osNumber || 'S/N'}
              </h2>
              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                {label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aberto em {new Date(os.openedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <DialogClose
            render={
              <button
                type="button"
                className="shrink-0 mt-0.5 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              />
            }
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* SLA */}
          <Section icon={Clock} title="Desempenho SLA">
            <div className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <SlaStatusBadge within={isWithin} />
                {os.slaTargetHours && (
                  <span className="text-xs text-muted-foreground">
                    Meta:{' '}
                    <span className="font-semibold text-foreground">
                      {os.slaTargetHours}h
                    </span>
                  </span>
                )}
              </div>

              {slaPercent !== null && <SlaBar percent={slaPercent} />}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground mb-1">Tempo útil</div>
                  <div className="text-sm font-mono font-semibold">
                    {os.slaUtilSeconds !== null ? formatSLATime(os.slaUtilSeconds) : '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground mb-1">Fechamento</div>
                  <div className="text-sm font-medium">
                    {os.closedAt ? (
                      new Date(os.closedAt).toLocaleString('pt-BR')
                    ) : (
                      <span className="text-muted-foreground font-normal">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Envolvidos */}
          <Section icon={User} title="Envolvidos">
            <div className="px-4">
              <InfoRow label="Técnico" value={os.technicianName} />
              <InfoRow label="Cliente" value={os.clientName} />
            </div>
          </Section>

          {/* Localidade & Plano */}
          <Section icon={MapPin} title="Localidade & Plano">
            <div className="px-4">
              <InfoRow label="Cidade" value={os.city} />
              <InfoRow label="Bairro" value={os.bairro} />
              <InfoRow label="Plano" value={os.plan} />
            </div>
          </Section>

          {/* Execução */}
          <Section icon={Wrench} title="Execução">
            <div className="p-4 space-y-3.5">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                  Motivo
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-sm leading-relaxed min-h-[48px]">
                  {os.reason || (
                    <span className="text-muted-foreground italic">
                      Sem descrição do motivo.
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                  Solução
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-sm leading-relaxed min-h-[48px] whitespace-pre-wrap break-words">
                  {os.solution || (
                    <span className="text-muted-foreground italic">
                      Sem detalhes da solução.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Foto anexada */}
          {os.fotoUrl && (
            <Section icon={ImageIcon} title="Foto Anexada">
              <div className="px-4">
                <div className="flex items-start gap-3 py-2.5">
                  <a
                    href={os.fotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    Abrir foto
                  </a>
                </div>
              </div>
            </Section>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
