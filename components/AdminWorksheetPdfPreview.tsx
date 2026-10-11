'use client';

import { useEffect, useRef, useState } from 'react';

type PdfDocument = import('pdfjs-dist').PDFDocumentProxy;
type PdfPage = import('pdfjs-dist').PDFPageProxy;

function PdfPageCanvas({ page, title }: { page: PdfPage; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = page.getViewport({ scale: 1.75 });
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const renderTask = page.render({ canvas, canvasContext: context, viewport });

    return () => renderTask.cancel();
  }, [page]);

  return (
    <canvas
      aria-label={title}
      className="block h-auto max-w-full bg-white shadow-lg"
      ref={canvasRef}
    />
  );
}

export function AdminWorksheetPdfPreview({ file, title }: { file: File; title: string }) {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let loadingTask: ReturnType<typeof import('pdfjs-dist')['getDocument']> | null = null;
    let loadedDocument: PdfDocument | null = null;

    async function loadPdf() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const bytes = new Uint8Array(await file.arrayBuffer());
        loadingTask = pdfjs.getDocument({ data: bytes });
        loadedDocument = await loadingTask.promise;
        if (!active) return;

        setDocument(loadedDocument);
        const loadedPages: PdfPage[] = [];
        for (let pageNumber = 1; pageNumber <= loadedDocument.numPages; pageNumber += 1) {
          loadedPages.push(await loadedDocument.getPage(pageNumber));
          if (!active) return;
        }
        setPages(loadedPages);
      } catch (caught) {
        if (!active || (caught instanceof Error && caught.name === 'AbortException')) return;
        setError('No se pudo generar la vista previa de este PDF. Puedes descargarlo con el botón inferior.');
      }
    }

    void loadPdf();
    return () => {
      active = false;
      loadingTask?.destroy();
    };
  }, [file]);

  if (error) {
    return <p className="m-4 rounded-xl bg-red-950 px-4 py-3 text-center text-sm" role="alert">{error}</p>;
  }

  if (!document || pages.length !== document.numPages) {
    return <p className="text-sm text-white/70">Preparando vista previa del PDF…</p>;
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 px-2 py-3">
      {pages.map((page, index) => (
        <PdfPageCanvas key={index} page={page} title={`${title}, página ${index + 1} de ${pages.length}`} />
      ))}
    </div>
  );
}
