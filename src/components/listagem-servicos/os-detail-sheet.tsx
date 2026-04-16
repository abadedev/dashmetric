'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, User, Clock, MapPin, Wifi, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OsServiceDetailSheetProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="text-xl">
              {record.networkBox || record.caixaRede || 'Sem caixa/rede'}
            </DialogTitle>
            <Badge variant="outline" className={badgeClass}>
              {record.status ?? '—'}
            </Badge>
          </div>
          <DialogDescription>
            {record.tipoOcorrencia || record.occurrence || record.tipo || '—'}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="space-y-5 text-sm">

          {/* Localização */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Localização
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Cidade / Área</div>
                <div className="font-medium">{record.cityArea || record.cidade || '—'}</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Rede / Caixa</div>
                <div className="font-medium font-mono text-xs">{record.networkBox || record.caixaRede || '—'}</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-md col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Endereço</div>
                <div className="font-medium">{record.address || record.endereco || '—'}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ocorrência */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> Ocorrência
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Tipo</div>
                <div className="font-medium">{record.tipoOcorrencia || record.occurrence || record.tipo || '—'}</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <Badge variant="outline" className={badgeClass}>{record.status ?? '—'}</Badge>
              </div>
            </div>
            {(record.observacaoInfra || record.problem || record.descricao || record.observacao) && (
              <div className="bg-muted/40 p-3 rounded-md mt-3">
                <div className="text-xs text-muted-foreground mb-1">Descrição / Obs</div>
                <div>{record.observacaoInfra || record.problem || record.descricao || record.observacao}</div>
              </div>
            )}
            {record.solution && (
              <div className="bg-muted/40 p-3 rounded-md mt-3">
                <div className="text-xs text-muted-foreground mb-1">Solução</div>
                <div>{record.solution}</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Técnico */}
          {(record.technician || record.tecnico) && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Técnico
                </h3>
                <div className="bg-muted/40 p-3 rounded-md">
                  <div className="font-medium">{record.technician || record.tecnico}</div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Solicitante */}
          {record.solicitante && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Solicitante
                </h3>
                <div className="bg-muted/40 p-3 rounded-md">
                  <div className="font-medium">{record.solicitante}</div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Registro */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Informações do Registro
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Adicionado em
                </div>
                <div className="font-medium">
                  {formatDateTime(record.createdAt || record.addedAt || record.dataImportacao)}
                </div>
              </div>
              <div className="bg-muted/40 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Data de referência
                </div>
                <div className="font-medium">
                  {record.referenceDate || record.dataReferencia
                    ? formatDateTime(record.referenceDate || record.dataReferencia)
                    : '—'}
                </div>
              </div>
              {record.resolutionDate && (
                <div className="bg-muted/40 p-3 rounded-md col-span-2">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Data de conclusão
                  </div>
                  <div className="font-medium">{formatDateTime(record.resolutionDate)}</div>
                </div>
              )}
              {(record.createdBy || record.addedByName || record.added_by_name) && (
                <div className="bg-muted/40 p-3 rounded-md col-span-2">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Adicionado por
                  </div>
                  <div className="font-medium">
                    {record.createdBy || record.addedByName || record.added_by_name}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
