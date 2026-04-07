'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type LogoVariant = 'dark' | 'light';

interface WorkspaceLogoUploaderProps {
  workspaceId: string;
  variant: LogoVariant;
  currentLogoUrl?: string | null;
  onSuccess?: (logoUrl: string | null) => void;
}

export function WorkspaceLogoUploader({
  workspaceId,
  variant,
  currentLogoUrl,
  onSuccess,
}: WorkspaceLogoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setPreview(currentLogoUrl ?? null);
  }, [currentLogoUrl]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;

      setError(null);
      setSuccess(false);
      setUploading(true);
      try {
        const form = new FormData();
        form.append('logo', file);

        const res = await fetch(`/api/workspaces/${workspaceId}/logo?variant=${variant}`, {
          method: 'POST',
          body: form,
        });

        const payload = (await res.json()) as { data?: { logoUrl: string }; error?: string };

        if (!res.ok) {
          setError(payload.error ?? 'Erro ao enviar logo.');
          return;
        }

        const url = payload.data!.logoUrl;
        setPreview(url);
        setSuccess(true);
        onSuccess?.(url);
      } catch {
        setError('Falha na conexão. Tente novamente.');
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, variant, onSuccess],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxSize: 2 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading || removing,
  });

  const rejectionError = fileRejections[0]?.errors[0];
  const displayError =
    error ??
    (rejectionError?.code === 'file-too-large'
      ? 'Arquivo muito grande. Máximo: 2 MB.'
      : rejectionError
        ? 'Formato inválido. Use PNG, JPEG ou WebP.'
        : null);

  async function handleRemove() {
    setError(null);
    setSuccess(false);
    setRemoving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/logo?variant=${variant}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setError(payload.error ?? 'Erro ao remover logo.');
        return;
      }
      setPreview(null);
      onSuccess?.(null);
    } catch {
      setError('Falha na conexão. Tente novamente.');
    } finally {
      setRemoving(false);
    }
  }

  const variantLabel = variant === 'dark' ? 'tema escuro' : 'tema claro';
  const previewBg = variant === 'dark' ? 'bg-zinc-900' : 'bg-white border border-border/70';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Thumbnail preview with theme-contextual background */}
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl', previewBg)}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`Logo ${variantLabel}`} className="h-full w-full object-contain p-1" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            'flex-1 cursor-pointer rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-colors',
            isDragActive
              ? 'border-primary/60 bg-primary/5 text-primary'
              : 'border-border/60 text-muted-foreground hover:border-border hover:bg-muted/20',
            (uploading || removing) && 'pointer-events-none opacity-60',
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </span>
          ) : isDragActive ? (
            'Solte o arquivo aqui'
          ) : (
            <>
              Arraste ou{' '}
              <span className="font-medium text-foreground">clique para selecionar</span>
              <br />
              <span className="text-xs">PNG, JPEG, WebP · máx. 2 MB · mín. 120×40 px · proporção 2:1–6:1</span>
            </>
          )}
        </div>

        {/* Remove button */}
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
            disabled={uploading || removing}
            title={`Remover logo do ${variantLabel}`}
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {success && !displayError && (
        <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Logo do {variantLabel} salva com sucesso.
        </p>
      )}
      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}
