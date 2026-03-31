'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_LABELS, formatSLATime } from '@/lib/services/sla-engine';
import { Separator } from '@/components/ui/separator';
import { Clock, User, MapPin, Wrench, FileText } from 'lucide-react';

interface OsDetailSheetProps {
  os: any;
  isOpen: boolean;
  onClose: () => void;
}

export function OsDetailSheet({ os, isOpen, onClose }: OsDetailSheetProps) {
  if (!os) return null;

  const isWithin = os.withinSlaUtil;
  const label = ACTIVITY_LABELS[os.activityType] || os.activityType;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">OS {os.osNumber || 'S/N'}</SheetTitle>
            <Badge variant="outline" className="text-sm">
              {label}
            </Badge>
          </div>
          <SheetDescription>
            Aberto em {new Date(os.openedAt).toLocaleString('pt-BR')}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {/* Status SLA */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Desempenho SLA
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Status Meta</div>
                {isWithin !== null ? (
                  <Badge
                    variant={isWithin ? 'default' : 'destructive'}
                    className={isWithin ? 'bg-green-600' : ''}
                  >
                    {isWithin ? 'NO PRAZO (OK)' : 'ATRASADO (NOK)'}
                  </Badge>
                ) : (
                  <span className="text-sm font-medium">Sem Meta</span>
                )}
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Tempo Útil</div>
                <div className="font-mono font-medium text-secondary-foreground">
                  {os.slaUtilSeconds !== null ? formatSLATime(os.slaUtilSeconds) : '-'}
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md col-span-2 flex justify-between items-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Fechamento</div>
                  <div className="text-sm">
                    {os.closedAt ? new Date(os.closedAt).toLocaleString('pt-BR') : 'Em andamento'}
                  </div>
                </div>
                {os.slaTargetHours !== null && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Meta</div>
                    <div className="text-sm font-medium">{os.slaTargetHours}h</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados Gerais */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Envolvidos
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-muted-foreground">Técnico:</span>
                <span className="font-medium">{os.technicianName || 'Não atribuído'}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-muted-foreground">Cliente:</span>
                <span>{os.clientName || 'Não informado'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Localidade */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Localidade & Plano
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-muted-foreground">Cidade:</span>
                <span>{os.city || 'Não informada'}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-muted-foreground">Plano:</span>
                <span>{os.plan || 'Não informado'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Execução */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Execução
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Motivo:</span>
                <div className="bg-muted/30 p-3 rounded-md min-h-[60px]">
                  {os.reason || <span className="text-muted-foreground italic">Sem descrição do motivo.</span>}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Solução:</span>
                <div className="bg-muted/30 p-3 rounded-md min-h-[60px]">
                  {os.solution || <span className="text-muted-foreground italic">Sem detalhes da solução.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
