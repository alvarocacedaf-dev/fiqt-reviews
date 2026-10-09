'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function AdminWorksheetViewer({
  fileId,
  fileName,
  mimeType,
  title,
}: {
  fileId: string;
  fileName: string;
  mimeType: string;
  title: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canShare = useMemo(() => (
    Boolean(file && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      && (!navigator.canShare || navigator.canShare({ files: [file] })))
  ), [file]);

  useEffect(() => {
    const controller = new AbortController();
    let localUrl = '';

    async function loadFile() {
      try {
        const response = await fetch(`/api/admin-worksheets/${encodeURIComponent(fileId)}/download`, {
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('No se pudo abrir el archivo.');
        const blob = await response.blob();
        const loadedFile = new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
        localUrl = URL.createObjectURL(loadedFile);
        setFile(loadedFile);
        setObjectUrl(localUrl);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
          setError(caught instanceof Error ? caught.message : 'No se pudo abrir el archivo.');
        }
      }
    }

    void loadFile();
    return () => {
      controller.abort();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [fileId, fileName, mimeType]);

  async function shareFile() {
    if (!file || !canShare) return;
    setMessage('');
    try {
      await navigator.share({ files: [file], title });
    } catch (caught) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) {
        setMessage('No se pudo compartir. Descarga el archivo y compártelo desde Archivos.');
      }
    }
  }

  const isImage = (mimeType || file?.type || '').startsWith('image/')
    || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName);
  const embeddedUrl = `/api/admin-worksheets/${encodeURIComponent(fileId)}/download?mode=embed`;

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-black text-white">
      <header className="border-b border-white/15 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <p className="truncate text-sm font-semibold" title={title}>{title}</p>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-auto pb-24">
        {!objectUrl && !error && <p className="text-sm text-white/70">Preparando archivo…</p>}
        {error && <p className="m-4 rounded-xl bg-red-950 px-4 py-3 text-sm" role="alert">{error}</p>}
        {objectUrl && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={title} className="max-h-full w-full object-contain" src={objectUrl} />
        )}
        {objectUrl && !isImage && (
          <iframe className="h-[calc(100dvh-8.5rem)] w-full border-0 bg-white" src={embeddedUrl} title={title} />
        )}
      </section>

      {message && <p className="fixed inset-x-3 bottom-24 z-20 rounded-xl bg-red-950 px-4 py-3 text-center text-sm">{message}</p>}
      <nav
        aria-label="Acciones del archivo"
        className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-white/15 bg-[#111]/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button className="flex min-w-20 flex-col items-center gap-1 text-xs" onClick={() => window.history.back()} type="button">
          <Icon className="h-6 w-6" name="arrow-left" />
          Volver
        </button>
        <button
          className="flex min-w-20 flex-col items-center gap-1 text-xs disabled:opacity-40"
          disabled={!canShare}
          onClick={() => void shareFile()}
          type="button"
        >
          <Icon className="h-6 w-6" name="attachment" />
          Compartir
        </button>
        <a
          className={`flex min-w-20 flex-col items-center gap-1 text-xs ${objectUrl ? '' : 'pointer-events-none opacity-40'}`}
          download={fileName}
          href={objectUrl || '#'}
        >
          <Icon className="h-6 w-6" name="file" />
          Descargar
        </a>
      </nav>
    </main>
  );
}
