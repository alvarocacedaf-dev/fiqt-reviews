'use client';

import { useEffect, useState } from 'react';

function wordPreviewDocument(content: string, title: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title.replace(/[&<>"']/g, '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; color: #0f172a; font-family: Arial, sans-serif; }
    article { width: min(100% - 24px, 900px); min-height: calc(100vh - 24px); margin: 12px auto; padding: 48px; background: white; box-shadow: 0 2px 14px rgba(15, 23, 42, .18); }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
    p { line-height: 1.5; }
    @media (max-width: 640px) { article { width: 100%; margin: 0; padding: 24px 18px; box-shadow: none; } }
  </style>
</head>
<body><article>${content}</article></body>
</html>`;
}

export function AdminWorksheetWordPreview({ file, title }: { file: File; title: string }) {
  const [documentHtml, setDocumentHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml(
          { arrayBuffer: await file.arrayBuffer() },
          { convertImage: mammoth.images.dataUri },
        );
        if (active) setDocumentHtml(wordPreviewDocument(result.value, title));
      } catch {
        if (active) setError('No se pudo generar la vista previa de este documento Word. Puedes descargarlo con el botón inferior.');
      }
    }

    void loadDocument();
    return () => {
      active = false;
    };
  }, [file, title]);

  if (error) {
    return <p className="m-4 rounded-xl bg-red-950 px-4 py-3 text-center text-sm" role="alert">{error}</p>;
  }

  if (!documentHtml) {
    return <p className="text-sm text-white/70">Preparando vista previa del documento Word…</p>;
  }

  return (
    <iframe
      className="h-[calc(100dvh-8.5rem)] w-full border-0 bg-slate-200"
      sandbox=""
      srcDoc={documentHtml}
      title={title}
    />
  );
}
