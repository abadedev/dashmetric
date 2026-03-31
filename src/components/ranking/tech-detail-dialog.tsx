'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Trophy, Clock, CheckCircle, Crosshair } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TechDetailDialogProps {
  tech: any;
  isOpen: boolean;
  onClose: () => void;
}

export function TechDetailDialog({ tech, isOpen, onClose }: TechDetailDialogProps) {
  if (!tech) return null;

  // Montar dados para o gráfico de barras
  const chartData = [
    { name: 'Inst Nova', uv: Number(tech.instNova) || 0 },
    { name: 'Inst Reat', uv: Number(tech.instReativacao) || 0 },
    { name: 'Reparo', uv: Number(tech.reparo) || 0 },
    { name: 'Mud End', uv: Number(tech.mudancaEndereco) || 0 },
    { name: 'Mud Plano', uv: Number(tech.mudancaPlano) || 0 },
    { name: 'Ret Kit', uv: Number(tech.retiradaKit) || 0 },
    { name: 'Retorno', uv: Number(tech.retorno) || 0 },
  ].filter(d => d.uv > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-bold text-xl text-primary border border-primary/20">
              {tech.position}º
            </div>
            <div>
              <DialogTitle className="text-2xl">{tech.technicianName}</DialogTitle>
              <DialogDescription>
                Resumo individual de desempenho (Período Selecionado)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
          <div className="bg-muted p-3 rounded-lg flex flex-col items-center justify-center text-center">
            <Trophy className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{tech.totalOS}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Entregue</div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold text-green-500">
              {tech.slaUtilPercent !== null ? `${tech.slaUtilPercent}%` : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">SLA Atingido</div>
          </div>

          <div className="bg-muted p-3 rounded-lg flex flex-col items-center justify-center text-center">
            <Clock className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-lg font-mono font-bold mt-1">
              {tech.avgSlaUtilFormatted}
            </div>
            <div className="text-xs text-muted-foreground mt-1">SLA Médio Útil</div>
          </div>

          <div className="bg-muted p-3 rounded-lg flex flex-col items-center justify-center text-center">
            <Crosshair className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">
              {tech.instNova + tech.instReativacao}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Instalações</div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="pt-2">
          <h4 className="font-semibold text-sm mb-4">Volume por Tipo de Atividade</h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ borderRadius: '8px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }}
                />
                <Bar dataKey="uv" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
