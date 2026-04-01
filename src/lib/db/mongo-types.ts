import type { ObjectId } from 'mongodb';

export interface AtendimentoDoc {
  _id?: ObjectId;
  numeroOs?: string | null;
  tipo: string;
  motivo?: string | null;
  solucao?: string | null;
  tecnico?: string | null;
  tecnicoId?: number | null;
  cliente?: string | null;
  cidade?: string | null;
  plano?: string | null;
  dataAbertura?: string | null;
  horaAbertura?: string | null;
  dataFinalizacao?: string | null;
  horaFinalizacao?: string | null;
  aberturaAt?: Date | null;
  finalizacaoAt?: Date | null;
  intervalo?: string | null;
  slaHoras?: number | null;
  dentroSla?: boolean | null;
  slaCorridoSegundos?: number | null;
  slaUtilSegundos?: number | null;
  dentroSlaUtil?: boolean | null;
  login?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  referencia?: string | null;
  atendente?: string | null;
  indicacao?: string | null;
  mac?: string | null;
  ativo?: string | null;
  empresa?: string | null;
  dataLiberada?: string | null;
  observacao?: string | null;
  coordenadas?: string | null;
  telefones?: string | null;
  agendamento?: string | null;
  hashImportacao: string;
  loteImportacaoId?: number | null;
  periodMonth?: number | null;
  periodYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityRecordDoc {
  _id?: ObjectId;
  osNumber?: string | null;
  indicator: string;
  reason?: string | null;
  solution?: string | null;
  technicianId?: number | null;
  technicianName?: string | null;
  clientName?: string | null;
  city?: string | null;
  plan?: string | null;
  openedAt?: Date | null;
  closedAt?: Date | null;
  durationSeconds?: number | null;
  periodMonth: number;
  periodYear: number;
  createdAt: Date;
}

export interface CancellationRecordDoc {
  _id?: ObjectId;
  clientName?: string | null;
  city?: string | null;
  reason?: string | null;
  source?: string | null;
  plan?: string | null;
  observation?: string | null;
  cancelledAt?: Date | null;
  periodMonth: number;
  periodYear: number;
  createdAt: Date;
}
