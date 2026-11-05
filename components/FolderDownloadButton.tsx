'use client';

import { useEffect, useRef, useState } from 'react';
import { InlineSpinner } from '@/components/ui/InlineSpinner';

export function FolderDownloadButton({ url, compact = false }: { url: string; compact?: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'started'>('idle');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach(timer => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current = [];
    setPhase('idle');
  }, [url]);

  function beginDownload(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    if (phase !== 'idle') {
      event.preventDefault();
      return;
    }

    setPhase('preparing');
    timers.current.push(window.setTimeout(() => setPhase('started'), 2500));
    timers.current.push(window.setTimeout(() => setPhase('idle'), 10000));
  }

  return (
    <span className={compact ? "block shrink-0" : "mt-4 block"} aria-live="polite">
      <a
        aria-disabled={phase !== 'idle'}
        className={`btn-primary inline-flex min-w-[190px] items-center justify-center gap-2 px-4 py-2.5 text-sm ${phase !== 'idle' ? 'cursor-wait opacity-80' : ''}`}
        download
        href={url}
        onClick={beginDownload}
      >
        {phase === 'preparing' && <InlineSpinner />}
        {phase === 'idle' ? 'Descargar carpeta ZIP' : phase === 'preparing' ? 'Preparando ZIP…' : 'Descarga iniciada ✓'}
      </a>
      {phase !== 'idle' && (
        <span className="mt-2 block text-xs font-semibold text-slate-600" role="status">
          {phase === 'preparing'
            ? 'Estamos reuniendo y ordenando los archivos. No necesitas volver a presionar el botón.'
            : 'La descarga continúa en tu navegador.'}
        </span>
      )}
    </span>
  );
}
