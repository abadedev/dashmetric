'use client';

import { CsvDropzone } from '@/components/upload/csv-dropzone';
import { FileSpreadsheet, Info } from 'lucide-react';

const COLUNAS = [
  '#', 'dataPedido', 'Agendamento', 'Tipo', 'Intervalo',
  'dataInstalacao', 'horaInicio', 'horaSaida', 'dataFinalizacao',
  'Instalador', 'Login', 'Cliente', 'Endereco', 'Bairro', 'Cidade',
  'Referencia', 'Atendente', 'Indicacao', 'MAC', 'Ativo',
  'Empresa', 'dataLiberada', 'Observacao', 'Coordenadas', 'Plano', 'Telefones',
];

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie um arquivo <strong>CSV</strong> ou <strong>XLSX</strong> exportado do sistema
          para popular o dashboard, ranking e indicadores de SLA.
        </p>
      </div>

      {/* Referência de colunas */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          Colunas aceitas no arquivo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COLUNAS.map((col) => (
            <span
              key={col}
              className="text-xs font-mono bg-background border rounded px-1.5 py-0.5 text-muted-foreground"
            >
              {col}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Datas no formato <span className="font-mono">DD/MM/AA - HH:MM</span>. Delimitador{' '}
          <span className="font-mono">;</span> (CSV) ou qualquer aba (XLSX).
          Colunas extras são ignoradas com segurança.
        </p>
      </div>

      {/* Upload */}
      <CsvDropzone />
    </div>
  );
}
