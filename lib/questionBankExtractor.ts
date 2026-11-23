import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { QuestionPage } from '@/lib/questionBankReview';

// Included explicitly in Next's function tracing. No browser worker URLs or CDN.
const dependencies = path.join(process.cwd(), 'node_modules');
type ExtractedPage = Omit<QuestionPage, 'path'> & { bytes: Buffer };

export async function openExamDocument(bytes: Uint8Array, pdf: boolean) {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const pdfjs = pdf ? await import('pdfjs-server/legacy/build/pdf.mjs') : null;
  const root = path.join(dependencies, 'pdfjs-server') + path.sep;
  if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(root, 'legacy/build/pdf.worker.mjs')).href;
  const document = pdfjs ? await pdfjs.getDocument({ data: bytes, useSystemFonts: true,
    standardFontDataUrl: root + 'standard_fonts/', cMapUrl: root + 'cmaps/', cMapPacked: true,
    wasmUrl: root + 'wasm/', isEvalSupported: false }).promise : null;
  const pageCount = document?.numPages ?? 1;
  if (pageCount > 40) { await document?.destroy(); throw new Error('El documento supera 40 páginas. Divide el archivo antes de procesarlo.'); }
  return {
    pageCount,
    async page(number: number): Promise<ExtractedPage> {
      let image: Buffer;
      let width: number;
      let height: number;
      let lines: QuestionPage['lines'] = [];
      if (document) {
        const page = await document.getPage(number);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 2000 / Math.max(base.width, base.height) });
        width = Math.ceil(viewport.width); height = Math.ceil(viewport.height);
        const canvas = createCanvas(width, height);
        // PDF.js accepts the native canvas at runtime; its declarations use DOM canvas.
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise;
        image = await canvas.encode('jpeg', 90);
        const content = await page.getTextContent();
        const fragments = content.items.flatMap(item => {
          if (!('str' in item) || !item.str.trim()) return [];
          const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
          return [{ text: item.str, x: x / width, y: Math.max(0, (y - item.height * viewport.scale) / height) }];
        }).sort((a, b) => a.y - b.y || a.x - b.x);
        for (const fragment of fragments) {
          const line = lines.find(l => Math.abs(l.y - fragment.y) < .004);
          if (line) { line.text += ' ' + fragment.text; line.x = Math.min(line.x, fragment.x); }
          else lines.push(fragment);
        }
        page.cleanup();
      } else {
        const result = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#fff' }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
        image = result.data; width = result.info.width; height = result.info.height;
      }
      if (lines.map(l => l.text).join('').length < 80) {
        worker ??= await createWorker('spa', 1, {
          workerPath: path.join(dependencies, 'tesseract.js/src/worker-script/node/index.js'),
          langPath: path.join(dependencies, '@tesseract.js-data/spa/4.0.0'),
          cacheMethod: 'none', gzip: true,
        });
        const result = await worker.recognize(image, {}, { blocks: true, text: true });
        lines = (result.data.blocks ?? []).flatMap(b => b.paragraphs.flatMap(p => p.lines.map(l => ({
          text: l.text, x: l.bbox.x0 / width, y: l.bbox.y0 / height,
        }))));
      }
      return { page: number, width, height, lines, bytes: image };
    },
    async close() { await worker?.terminate(); await document?.destroy(); },
  };
}
