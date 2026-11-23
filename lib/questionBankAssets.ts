import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRegions, type QuestionPage } from '@/lib/questionBankReview';

export async function renderQuestionCrop(regions: unknown, pages: QuestionPage[]) {
  const selected = validateRegions(regions, pages);
  const db = createAdminClient();
  const pieces = [];
  for (const r of selected) {
    const page = pages.find(p => p.page === r.page)!;
    const { data, error } = await db.storage.from('admin-worksheets').download(page.path);
    if (error || !data) throw new Error('No se pudo leer la página.');
    const left = Math.floor(r.left * page.width), top = Math.floor(r.top * page.height);
    const width = Math.min(page.width - left, Math.max(1, Math.round(r.width * page.width)));
    const height = Math.min(page.height - top, Math.max(1, Math.round(r.height * page.height)));
    const result = await sharp(new Uint8Array(await data.arrayBuffer())).extract({ left, top, width, height })
      .resize({ width: 1500, withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
    pieces.push(result);
  }
  const width = Math.max(...pieces.map(p => p.info.width));
  const height = pieces.reduce((n, p) => n + p.info.height + 16, 0);
  if (width * height > 35_000_000) throw new Error('El recorte es demasiado grande; separa las preguntas.');
  let top = 0;
  const composite = pieces.map(p => { const item = { input: p.data, left: 0, top }; top += p.info.height + 16; return item; });
  const bytes = await sharp({ create: { width, height, channels: 3, background: '#fff' } }).composite(composite).jpeg({ quality: 92 }).toBuffer();
  return { bytes, width, height, regions: selected };
}
