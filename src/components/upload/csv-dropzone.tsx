'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileSpreadsheet, UploadCloud, FileWarning,
  CheckCircle2, X, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ErroLinha  { linha: number; erro: string }
interface WarningLinha { linha: number; aviso: string }

type TipoPlanilha = 'atendimentos' | 'qualidade' | 'suporte';

const TIPO_LABEL: Record<TipoPlanilha, string> = {
  atendimentos: 'Atendimentos / Instalações',
  qualidade:    'Qualidade & Reclamações',
  suporte:      'Suporte Técnico',
};

interface ResumoGenerico {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  // atendimentos
  totalValidas?: number;
  totalDuplicadas?: number;
  erros?: ErroLinha[];
  warnings?: WarningLinha[];
}

interface ImportResult {
  tipoPlanilha: TipoPlanilha;
  message: string;
  loteId?: number;
  resumo: ResumoGenerico;
}

const ACCEPT = {
  'text/csv':                                                    ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel':                                    ['.xls'],
};

export function CsvDropzone() {
  const [file,        setFile]        = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [result,      setResult]      = useState<ImportResult | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); setErrorMsg(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProgress(20);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(
        () => setProgress((p) => Math.min(p + 8, 85)),
        600
      );

      const res = await fetch('/api/importar/atendimentos', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Servidor retornou resposta inválida (status ${res.status})`);
      }

      if (!res.ok) throw new Error((data.error as string) || `Erro ${res.status} na importação`);

      setResult(data as unknown as ImportResult);
      toast.success(`${(data.resumo as ImportResult['resumo'])?.totalInseridas ?? 0} registros inseridos com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast.error(msg);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setProgress(0); };

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (result) {
    const { resumo, tipoPlanilha } = result;
    const tipoLabel = TIPO_LABEL[tipoPlanilha] ?? 'Arquivo';

    // Stats adaptadas por tipo
    const stats: { label: string; val: number; color: string }[] = [
      { label: 'Lidas',     val: resumo.totalLidas,     color: '' },
      { label: 'Inseridas', val: resumo.totalInseridas, color: 'text-green-500' },
      { label: 'Inválidas', val: resumo.totalInvalidas, color: resumo.totalInvalidas > 0 ? 'text-red-500' : '' },
      ...(tipoPlanilha === 'atendimentos' ? [
        { label: 'Válidas',    val: resumo.totalValidas    ?? 0, color: 'text-blue-500' },
        { label: 'Duplicadas', val: resumo.totalDuplicadas ?? 0, color: 'text-yellow-500' },
      ] : []),
    ];

    return (
      <div className="rounded-xl border bg-card p-8 flex flex-col items-center gap-5 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div>
          <h3 className="text-lg font-bold">Importação concluída</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-primary">{tipoLabel}</span>
            {result.loteId ? ` · Lote #${result.loteId}` : ''} · {file?.name}
          </p>
        </div>

        {/* Stats grid */}
        <div className={`grid grid-cols-${stats.length} divide-x divide-border w-full border rounded-lg text-center`}>
          {stats.map(({ label, val, color }) => (
            <div key={label} className="py-4 px-1 space-y-1">
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {(resumo.warnings?.length ?? 0) > 0 && (
          <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-left">
            <p className="text-sm font-semibold text-yellow-600 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="h-4 w-4" /> {resumo.warnings!.length} aviso(s)
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-yellow-600">
              {resumo.warnings!.slice(0, 5).map((w, i) => (
                <li key={i}>Linha {w.linha}: {w.aviso}</li>
              ))}
              {resumo.warnings!.length > 5 && (
                <li>…e mais {resumo.warnings!.length - 5} aviso(s)</li>
              )}
            </ul>
          </div>
        )}

        {/* Erros */}
        {(resumo.erros?.length ?? 0) > 0 && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
            <p className="text-sm font-semibold text-red-500 flex items-center gap-1.5 mb-1.5">
              <FileWarning className="h-4 w-4" /> {resumo.erros!.length} erro(s)
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-red-400">
              {resumo.erros!.slice(0, 8).map((e, i) => (
                <li key={i}>Linha {e.linha}: {e.erro}</li>
              ))}
              {resumo.erros!.length > 8 && (
                <li>…e mais {resumo.erros!.length - 8} erro(s)</li>
              )}
            </ul>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={reset}>Nova importação</Button>
      </div>
    );
  }

  // ── Dropzone vazio ────────────────────────────────────────────────────────
  if (!file) {
    return (
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed cursor-pointer transition-all p-14 flex flex-col items-center gap-3 text-center select-none ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`p-3 rounded-full ${isDragActive ? 'bg-primary/10' : 'bg-muted'}`}>
          <UploadCloud className={`h-7 w-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-medium text-sm">Arraste o arquivo aqui</p>
          <p className="text-xs text-muted-foreground mt-0.5">ou clique para selecionar</p>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1">CSV ou XLSX · Máx. 50 MB</p>
      </div>
    );
  }

  // ── Arquivo selecionado ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          onClick={reset}
          disabled={isUploading}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors shrink-0"
          aria-label="Remover arquivo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Banner de erro inline */}
      {errorMsg && !isUploading && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <FileWarning className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Falha na importação</p>
            <p className="text-xs text-red-400/80 mt-0.5 break-all">{errorMsg}</p>
          </div>
        </div>
      )}

      {isUploading ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processando, normalizando e calculando SLA…</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : (
        <Button className="w-full" onClick={handleUpload}>
          Importar Atendimentos / Instalações
        </Button>
      )}
    </div>
  );
}
