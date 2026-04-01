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

type TipoPlanilha = 'atendimentos' | 'qualidade' | 'suporte' | 'vendas' | 'cancelamentos' | 'infraestrutura';
type TipoImportacao = TipoPlanilha | 'auto';

const TIPO_IMPORTACAO_LABEL: Record<TipoImportacao, string> = {
  auto: 'Detectar automaticamente',
  atendimentos: 'Atendimento / Instalacao',
  qualidade: 'Qualidade / Reclamacoes',
  suporte: 'Suporte Tecnico',
  vendas: 'Vendas',
  cancelamentos: 'Cancelamentos',
  infraestrutura: 'Infraestrutura',
};

const TIPO_LABEL: Record<TipoPlanilha, string> = {
  atendimentos: 'Atendimentos / Instalacoes',
  qualidade: 'Qualidade / Reclamacoes',
  suporte: 'Suporte Tecnico',
  vendas: 'Vendas',
  cancelamentos: 'Cancelamentos',
  infraestrutura: 'Infraestrutura',
};

interface ResumoGenerico {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
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

export function CsvDropzone() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tipoPlanilha, setTipoPlanilha] = useState<TipoImportacao>('auto');
  const [reimportarQualidade, setReimportarQualidade] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setResult(null);
      setErrorMsg(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
  });

  const mostrarReimportacao = tipoPlanilha === 'qualidade';

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(20);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    if (tipoPlanilha !== 'auto') {
      formData.append('tipoPlanilha', tipoPlanilha);
    }

    if (mostrarReimportacao && reimportarQualidade) {
      formData.append('reimportarQualidade', 'true');
    }

    try {
      const interval = setInterval(() => {
        setProgress((value) => Math.min(value + 8, 85));
      }, 600);

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
        throw new Error(`Servidor retornou resposta invalida (status ${res.status})`);
      }

      if (!res.ok) {
        throw new Error((data.error as string) || `Erro ${res.status} na importacao`);
      }

      setResult(data as unknown as ImportResult);
      toast.success(
        `${(data.resumo as ImportResult['resumo'])?.totalInseridas ?? 0} registros inseridos com sucesso!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast.error(msg);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  const TipoSelect = ({ disabled = false }: { disabled?: boolean }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">Tipo do arquivo</p>
      <Select value={tipoPlanilha} onValueChange={(value) => setTipoPlanilha(value as TipoImportacao)}>
        <SelectTrigger className="w-full" disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">{TIPO_IMPORTACAO_LABEL.auto}</SelectItem>
          <SelectItem value="atendimentos">{TIPO_IMPORTACAO_LABEL.atendimentos}</SelectItem>
          <SelectItem value="qualidade">{TIPO_IMPORTACAO_LABEL.qualidade}</SelectItem>
          <SelectItem value="suporte">{TIPO_IMPORTACAO_LABEL.suporte}</SelectItem>
          <SelectItem value="vendas">{TIPO_IMPORTACAO_LABEL.vendas}</SelectItem>
          <SelectItem value="cancelamentos">{TIPO_IMPORTACAO_LABEL.cancelamentos}</SelectItem>
          <SelectItem value="infraestrutura">{TIPO_IMPORTACAO_LABEL.infraestrutura}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Se preferir, marque manualmente o tipo antes do upload.
      </p>
    </div>
  );

  const ReimportacaoToggle = ({ disabled = false }: { disabled?: boolean }) => {
    if (!mostrarReimportacao) return null;

    return (
      <label className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-left">
        <input
          type="checkbox"
          checked={reimportarQualidade}
          disabled={disabled}
          onChange={(e) => setReimportarQualidade(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Reimportacao segura de qualidade</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Antes de importar, remove apenas os registros de qualidade dos mesmos periodos
            encontrados na planilha.
          </p>
        </div>
      </label>
    );
  };

  if (result) {
    const { resumo, tipoPlanilha: tipoDetectado } = result;
    const tipoLabel = TIPO_LABEL[tipoDetectado] ?? 'Arquivo';

    const stats: { label: string; val: number; color: string }[] = [
      { label: 'Lidas', val: resumo.totalLidas, color: '' },
      { label: 'Inseridas', val: resumo.totalInseridas, color: 'text-green-500' },
      {
        label: 'Invalidas',
        val: resumo.totalInvalidas,
        color: resumo.totalInvalidas > 0 ? 'text-red-500' : '',
      },
      ...(tipoDetectado === 'atendimentos'
        ? [
            { label: 'Validas', val: resumo.totalValidas ?? 0, color: 'text-blue-500' },
            { label: 'Duplicadas', val: resumo.totalDuplicadas ?? 0, color: 'text-yellow-500' },
          ]
        : []),
    ];

    return (
      <div className="flex flex-col items-center gap-5 rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />

        <div>
          <h3 className="text-lg font-bold">Importacao concluida</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{tipoLabel}</span>
            {result.loteId ? ` · Lote #${result.loteId}` : ''} · {file?.name}
          </p>
        </div>

        {result.reimportacao ? (
          <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-left">
            <p className="text-sm font-semibold text-amber-700">Reimportacao segura executada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Removidos {result.reimportacao.registrosRemovidos} registro(s) dos periodo(s):{' '}
              {result.reimportacao.periodos.join(', ')}.
            </p>
          </div>
        ) : null}

        <div
          className="grid w-full divide-x divide-border rounded-lg border text-center"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map(({ label, val, color }) => (
            <div key={label} className="space-y-1 px-1 py-4">
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {(resumo.warnings?.length ?? 0) > 0 && (
          <div className="w-full rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-left">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-yellow-600">
              <AlertTriangle className="h-4 w-4" /> {resumo.warnings!.length} aviso(s)
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-yellow-600">
              {resumo.warnings!.slice(0, 5).map((w, i) => (
                <li key={i}>
                  Linha {w.linha}: {w.aviso}
                </li>
              ))}
              {resumo.warnings!.length > 5 && (
                <li>...e mais {resumo.warnings!.length - 5} aviso(s)</li>
              )}
            </ul>
          </div>
        )}

        {(resumo.erros?.length ?? 0) > 0 && (
          <div className="w-full rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-left">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-red-500">
              <FileWarning className="h-4 w-4" /> {resumo.erros!.length} erro(s)
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-400">
              {resumo.erros!.slice(0, 8).map((e, i) => (
                <li key={i}>
                  Linha {e.linha}: {e.erro}
                </li>
              ))}
              {resumo.erros!.length > 8 && (
                <li>...e mais {resumo.erros!.length - 8} erro(s)</li>
              )}
            </ul>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={reset}>
          Nova importacao
        </Button>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="space-y-4">
        <TipoSelect />
        <ReimportacaoToggle />

        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-14 text-center transition-all select-none ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20'
          }`}
        >
          <input {...getInputProps()} />
          <div className={`rounded-full p-3 ${isDragActive ? 'bg-primary/10' : 'bg-muted'}`}>
            <UploadCloud
              className={`h-7 w-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Arraste o arquivo aqui</p>
            <p className="mt-0.5 text-xs text-muted-foreground">ou clique para selecionar</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground/60">CSV ou XLSX · Max. 50 MB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <TipoSelect disabled={isUploading} />
      <ReimportacaoToggle disabled={isUploading} />

      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          onClick={reset}
          disabled={isUploading}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          aria-label="Remover arquivo"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {errorMsg && !isUploading && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-400">Falha na importacao</p>
            <p className="mt-0.5 break-all text-xs text-red-400/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {isUploading ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Processando arquivo de {TIPO_IMPORTACAO_LABEL[tipoPlanilha].toLowerCase()}...
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : (
        <Button className="w-full" onClick={handleUpload}>
          Importar {TIPO_IMPORTACAO_LABEL[tipoPlanilha]}
        </Button>
      )}
    </div>
  );
}
