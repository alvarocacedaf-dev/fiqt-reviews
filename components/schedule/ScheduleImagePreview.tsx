'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ScheduleImagePreview({ file, onClose }: { file: File; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      // Give the browser time to start any download before releasing its URL.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    };
  }, [file]);

  async function share() {
    setSharing(true);
    setMessage('');
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('No se pudo compartir. Puedes guardar la imagen y compartirla desde Descargas.');
      }
    } finally {
      setSharing(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="Vista previa del horario"
      onCancel={onClose}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none bg-[#101010] p-0 text-white backdrop:bg-black"
    >
      <div className="flex h-full flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="flex flex-col gap-3 border-b border-white/20 p-4">
          <p className="w-full truncate text-sm text-white/80" title={file.name}>{file.name}</p>
          <div className="flex w-full items-center gap-2">
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-white/40 px-3 py-2">Volver</button>
            <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
              {canShare && <button type="button" disabled={sharing} onClick={() => void share()} className="shrink-0 rounded-lg bg-white px-3 py-2 font-bold text-black disabled:opacity-50">{sharing ? 'Compartiendo…' : 'Compartir'}</button>}
              {url && <a href={url} download={file.name} onClick={() => setMessage('Descarga solicitada. Busca la imagen en Archivos → Descargas o en las descargas del navegador.')} className="truncate rounded-lg border border-white/40 px-3 py-2 text-center">Descargar imagen</a>}
            </div>
          </div>
        </header>
        {message && <p role="status" className="bg-white/10 px-4 py-3 text-sm">{message}</p>}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          {/* Native image preserves the generated PNG and Android's long-press image actions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt="Imagen del horario generado" className="max-h-full w-full object-contain" />}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
