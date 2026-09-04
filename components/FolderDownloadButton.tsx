'use client';

import { useState } from 'react';

function fileNameFromDisposition(disposition: string | null) {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'planchas.zip';
}

export function FolderDownloadButton({ url }: { url: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function downloadFolder() {
    if (downloading) return;
    setDownloading(true);
    setError('');

    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('No se pudo preparar la carpeta ZIP.');

      const blob = await response.blob();
      const fileName = fileNameFromDisposition(response.headers.get('content-disposition'));
      const file = new File([blob], fileName, { type: 'application/zip' });
      const shareData = { files: [file], title: fileName };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'No se pudo descargar la carpeta ZIP.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-4">
      <button className="btn-primary inline-flex px-4 py-2.5 text-sm" disabled={downloading} onClick={downloadFolder} type="button">
        {downloading ? 'Preparando carpeta...' : 'Descargar carpeta ZIP'}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
}
