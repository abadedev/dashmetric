'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileWarning,
  UploadCloud,
  X,
  Download,
  Loader2,
  Check,
  ServerCog,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ErroLinha {
  linha: number;
  erro: string;
}

interface WarningLinha {
  linha: number;
  aviso: string;
}

export interface ImportProfile {
  id: number;
  profileKey: string;
  label: string;
  detectorType: string;
  parameters: unknown;
}

interface CsvDropzoneProps {
  profiles: ImportProfile[];
}

interface ResumoGenerico {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  totalValidas?: number;
  totalDuplicadas?: number;
  erros?: ErroLinha[];
  warnings?: WarningLinha[];
  debug?: { indicadorColuna: string; sampleIndicadores: string[] };
}

interface ImportResult {
  tipoPlanilha: string;
  message: string;
  loteId?: number;
  resumo: ResumoGenerico;
  reimportacao?: {
    periodos: string[];
    registrosRemovidos: number;
  };
}

const ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

const MAX_UPLOAD_SIZE_MB = 50;

export function CsvDropzone({ profiles }: CsvDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'processing' | 'finished'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDetectorType, setSelectedDetectorType] = useState<string>('auto');
  const [reimportarQualidade, setReimportarQualidade] = useState(false);

  const selectedProfile = profiles.find((p) => p.detectorType === selectedDetectorType);
  const mostrarReimportacao = selectedDetectorType === 'qualidade';

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setResult(null);
      setErrorMsg(null);
      setUploadStatus('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    if (!selectedProfile) return;
    
    let headers = '';
    const params = selectedProfile.parameters as Array<{ excelColumn: string; systemField: string }>;
    
    if (Array.isArray(params) && params.length > 0) {
      headers = params.map((p) => p.excelColumn).join(';');
    } else {
      const COLUNAS_PADRAO = [
        '#', 'dataPedido', 'Agendamento', 'Tipo', 'Intervalo',
        'dataInstalacao', 'horaInicio', 'horaSaida', 'dataFinalizacao',
        'Instalador', 'Login', 'Cliente', 'Endereco', 'Bairro', 'Cidade',
        'Referencia', 'Atendente', 'Indicacao', 'MAC', 'Ativo',
        'Empresa', 'dataLiberada', 'Observacao', 'Coordenadas', 'Plano', 'Telefones',
      ];
      headers = COLUNAS_PADRAO.join(';');
    }
    
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${selectedProfile.profileKey || 'import'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('validating');
    setProgress(15);
    setErrorMsg(null);

    // Simulate validation phase UX
    await new Promise((resolve) => setTimeout(resolve, 800));

    setUploadStatus('processing');
    setProgress(35);

    const formData = new FormData();
    formData.append('file', file);

    if (selectedDetectorType !== 'auto') {
      formData.append('tipoPlanilha', selectedDetectorType);
    }

    if (mostrarReimportacao && reimportarQualidade) {
      formData.append('reimportarQualidade', 'true');
    }

    try {
      const interval = setInterval(() => {
        setProgress((value) => Math.min(value + 4, 90));
      }, 500);

      const res = await fetch('/api/importar', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        if (res.status === 413) {
          throw new Error(
            `Arquivo muito grande para o servidor atual. Limite configurado: ${MAX_UPLOAD_SIZE_MB} MB.`
          );
        }
        throw new Error(`Servidor retornou resposta invalida (status ${res.status})`);
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error(
            `Arquivo muito grande para o servidor atual. Limite configurado: ${MAX_UPLOAD_SIZE_MB} MB.`
          );
        }
        throw new Error((data.error as string) || `Erro ${res.status} na importacao`);
      }

      setResult(data as unknown as ImportResult);
      setUploadStatus('finished');
      toast.success(
        `${(data.resumo as ImportResult['resumo'])?.totalInseridas ?? 0} registros inseridos com sucesso!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast.error(msg);
      setProgress(0);
      setUploadStatus('idle');
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setUploadStatus('idle');
    setErrorMsg(null);
  };

  const TipoSelect = ({ disabled = false }: { disabled?: boolean }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Tipo do arquivo</p>
      <Select value={selectedDetectorType} onValueChange={(val) => val && setSelectedDetectorType(val)}>
        <SelectTrigger className="w-full" disabled={disabled}>
          <SelectValue placeholder="Detectar automaticamente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Detectar automaticamente</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.detectorType}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
        <p>Se preferir, marque manualmente o tipo antes do upload.</p>
        
        {selectedDetectorType !== 'auto' && (
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-7 px-3 flex items-center gap-1.5 transition-colors text-primary hover:text-primary">
            <Download className="w-3.5 h-3.5" />
            Baixar Modelo
          </Button>
        )}
      </div>

      {(!profiles || profiles.length === 0) && (
        <p className="text-sm text-red-500">Nenhum perfil de importação ativo disponível no banco.</p>
      )}
    </div>
  );

  const ReimportacaoToggle = ({ disabled = false }: { disabled?: boolean }) => {
    if (!mostrarReimportacao) return null;

    return (
      <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left cursor-pointer transition-colors hover:bg-amber-500/10">
        <input
          type="checkbox"
          checked={reimportarQualidade}
          disabled={disabled}
          onChange={(e) => setReimportarQualidade(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
        />
        <div>
          <p className="text-sm font-medium text-amber-700">Reimportação de Qualidade</p>
          <p className="mt-1 text-xs text-amber-700/80">
            Atenção: Ativar esta opção removerá os registros dos períodos detectados antes da nova inserção.
          </p>
        </div>
      </label>
    );
  };

  if (result) {
    const { resumo, tipoPlanilha: tipoDetectado } = result;
    const prof = profiles.find(p => p.detectorType === tipoDetectado);
    const tipoLabel = prof ? prof.label : tipoDetectado;

    const stats: { label: string; val: number; color: string }[] = [
      { label: 'Lidas', val: resumo.totalLidas, color: 'text-foreground' },
      { label: 'Inseridas', val: resumo.totalInseridas, color: 'text-green-500' },
      {
        label: 'Inválidas',
        val: resumo.totalInvalidas,
        color: resumo.totalInvalidas > 0 ? 'text-red-500' : 'text-foreground',
      },
      ...(tipoDetectado === 'atendimentos'
        ? [
            { label: 'Válidas', val: resumo.totalValidas ?? 0, color: 'text-blue-500' },
            { label: 'Duplicadas', val: resumo.totalDuplicadas ?? 0, color: 'text-yellow-500' },
          ]
        : []),
    ];

    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="h-14 w-14 text-green-500" />

        <div>
          <h3 className="text-lg font-semibold">Importação concluída</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-primary">{tipoLabel}</span>
            {result.loteId ? ` • Lote #${result.loteId}` : ''} • {file?.name}
          </p>
        </div>

        {result.reimportacao ? (
          <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
            <p className="text-sm font-medium text-amber-700">Reimportação Executada</p>
            <p className="mt-1 text-xs text-amber-700/80">
              Removidos {result.reimportacao.registrosRemovidos} registros dos períodos: {result.reimportacao.periodos.join(', ')}
            </p>
          </div>
        ) : null}

        <div
          className="grid w-full divide-x divide-border rounded-xl border bg-muted/10 text-center"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map(({ label, val, color }) => (
            <div key={label} className="space-y-1 p-4">
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {(resumo.warnings?.length ?? 0) > 0 && (
          <div className="w-full rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-left">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-600">
              <AlertTriangle className="h-4 w-4" /> {resumo.warnings!.length} avisos
            </p>
            <ul className="space-y-1 pl-6 text-sm text-yellow-600/90 list-disc">
              {resumo.warnings!.slice(0, 5).map((w, i) => (
                <li key={i}>Linha {w.linha}: {w.aviso}</li>
              ))}
              {resumo.warnings!.length > 5 && (
                <li className="font-medium">... e mais {resumo.warnings!.length - 5} avisos omitidos</li>
              )}
            </ul>
          </div>
        )}

        {resumo.debug && (
          <div className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-left">
            <p className="mb-1 text-sm font-medium text-blue-500">Debug — Coluna de indicador detectada</p>
            <p className="text-xs text-blue-400">
              Coluna: <span className="font-mono font-bold">{resumo.debug.indicadorColuna}</span>
            </p>
            <p className="mt-1 text-xs text-blue-400">
              Valores das primeiras linhas:{' '}
              <span className="font-mono">{resumo.debug.sampleIndicadores.map(v => `"${v}"`).join(', ')}</span>
            </p>
          </div>
        )}

        {(resumo.erros?.length ?? 0) > 0 && (
          <div className="w-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-500">
              <FileWarning className="h-4 w-4" /> {resumo.erros!.length} erros críticos
            </p>
            <ul className="space-y-1 pl-6 text-sm text-red-500/90 list-disc">
              {resumo.erros!.slice(0, 8).map((e, i) => (
                <li key={i}>Linha {e.linha}: {e.erro}</li>
              ))}
              {resumo.erros!.length > 8 && (
                <li className="font-medium">... e mais {resumo.erros!.length - 8} erros omitidos</li>
              )}
            </ul>
          </div>
        )}

        <Button className="w-full" onClick={reset} variant="outline">
          Nova Importação
        </Button>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="space-y-6">
        <TipoSelect />
        <ReimportacaoToggle />

        <div
          {...getRootProps()}
          className={`group flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-16 text-center transition-all select-none ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <input {...getInputProps()} />
          <div className={`rounded-full p-4 transition-colors ${isDragActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary'}`}>
            <UploadCloud className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {isDragActive ? 'Solte para importar' : 'Arraste seu arquivo de dados aqui'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">ou clique para selecionar do seu computador (CSV ou XLSX)</p>
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground/60 rounded bg-muted/50 px-2 py-1">Tamanho Máx. {MAX_UPLOAD_SIZE_MB}MB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <TipoSelect disabled={uploadStatus !== 'idle'} />
      <ReimportacaoToggle disabled={uploadStatus !== 'idle'} />

      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="shrink-0 rounded-lg bg-primary/10 p-3 text-primary">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          onClick={reset}
          disabled={uploadStatus !== 'idle'}
          className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          aria-label="Remover arquivo"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {errorMsg && uploadStatus === 'idle' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-500">Erro na Importação</p>
            <p className="mt-1 break-all text-sm text-red-500/90">{errorMsg}</p>
          </div>
        </div>
      )}

      {uploadStatus !== 'idle' ? (
        <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex justify-between text-sm font-medium text-primary">
            <span>
              {uploadStatus === 'validating' ? 'Validando dados localmente...' : 'Pensando... / Processando importação...'}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-primary/20" />
          
          <div className="grid grid-cols-3 pt-4 border-t border-primary/10 mt-2">
            <div className="flex flex-col items-center gap-2 text-primary">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-primary/20 border-primary">
                <Check className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">Arquivo</span>
            </div>
            
            <div className={`flex flex-col items-center gap-2 ${uploadStatus === 'processing' ? 'text-primary' : uploadStatus === 'validating' ? 'text-primary' : 'text-muted-foreground/50'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${uploadStatus === 'processing' ? 'bg-primary/20 border-primary' : uploadStatus === 'validating' ? 'bg-primary/20 border-primary' : 'bg-muted border-transparent'}`}>
                {uploadStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">Validando</span>
            </div>
            
            <div className={`flex flex-col items-center gap-2 ${uploadStatus === 'processing' ? 'text-primary' : 'text-muted-foreground/50'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${uploadStatus === 'processing' ? 'bg-primary/20 border-primary' : 'bg-muted border-transparent'}`}>
                {uploadStatus === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerCog className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">Servidor</span>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          className="w-full h-12 text-sm" 
          onClick={handleUpload}
        >
          Importar Arquivo
        </Button>
      )}
    </div>
  );
}
