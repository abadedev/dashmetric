'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } finally {
      setLoading(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline flex-1 min-w-0"
        >
          <ImageIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">Ver foto anexada</span>
        </a>
        {!disabled && (
          <button
            onClick={() => onChange(null)}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {loading ? 'Enviando...' : 'Anexar foto'}
      </Button>
    </>
  );
}
