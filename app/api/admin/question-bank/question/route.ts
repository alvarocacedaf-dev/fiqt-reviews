import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createAdminClient } from '@/lib/supabase/admin';
import { getExamBank } from '@/lib/examQuestionBank';
import { examGeneratorKey } from '@/lib/examGeneratorConfig';
import { renderQuestionCrop } from '@/lib/questionBankAssets';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isOwner) return NextResponse.json({ error: 'Solo el propietario puede publicar preguntas.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !Number.isInteger(body.version) || !['save','approve','discard'].includes(body.action)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  const db = createAdminClient();
  const { data: draft } = await db.from('exam_bank_questions').select('*,exam_bank_jobs(*)').eq('id', body.id).maybeSingle();
  if (!draft) return NextResponse.json({ error: 'No existe.' }, { status: 404 });
  if (draft.status !== 'draft' || draft.version !== body.version || draft.exam_bank_jobs.status !== 'review') return NextResponse.json({ error: 'La pregunta cambió. Actualiza antes de continuar.' }, { status: 409 });
  try {
    const values: Record<string, unknown> = { version: draft.version + 1 };
    if (body.action === 'discard') values.status = 'discarded';
    else {
      if (!Number.isInteger(body.number) || body.number < 1 || body.number > 100) throw new Error('Indica el número original de la pregunta.');
      if (body.action === 'approve' && body.confirmed !== true) throw new Error('Confirma que el enunciado está completo, sin respuestas y no es un duplicado.');
      const crop = await renderQuestionCrop(body.regions, draft.exam_bank_jobs.pages);
      const hash = createHash('sha256').update(crop.bytes).digest('hex');
      const key = examGeneratorKey({ bank: draft.bank_key });
      if (!key) throw new Error('Banco desconocido.');
      if (body.action === 'approve') {
        if (getExamBank(key).questions.some(q => q.sha256 === hash)) throw new Error('Esta imagen ya está en el banco original.');
        const duplicate = await db.from('exam_bank_questions').select('id').eq('bank_key', key).eq('status', 'approved').eq('content_hash', hash).limit(1);
        if (duplicate.error) throw new Error('No se pudieron comprobar los duplicados.');
        if (duplicate.data?.length) throw new Error('Esta imagen ya fue aprobada. Descarta el duplicado.');
      }
      const source = await db.from('admin_worksheets').select('title,academic_term,file_name').eq('id', draft.exam_bank_jobs.worksheet_id).single();
      if (source.error || !source.data) throw new Error('No se encontró la fuente original.');
      const assetPath = `question-bank/live/${key}/${draft.id}/${hash}.jpg`;
      const upload = await db.storage.from('admin-worksheets').upload(assetPath, crop.bytes, { contentType: 'image/jpeg', upsert: true });
      if (upload.error) throw new Error('No se pudo guardar el recorte.');
      const question = {
        id: draft.id, duplicateKey: `live-${draft.id}`, originalNumber: body.number,
        sourceId: draft.exam_bank_jobs.worksheet_id, sourceTitle: source.data.title,
        term: source.data.academic_term || 'Sin ciclo', page: crop.regions[0].page,
        sourcePages: [...new Set(crop.regions.map(r => r.page))], assetPath, status: 'reviewed',
        sha256: hash, width: crop.width, height: crop.height, containsAnnotations: body.annotations === true,
        localSource: source.data.file_name, rectangles: crop.regions.map(r => [r.page, r.left, r.top, r.width, r.height]),
      };
      Object.assign(values, { regions: crop.regions, question, content_hash: hash });
      if (body.action === 'approve') Object.assign(values, { status: 'approved', reviewed_by: context.user.id, reviewed_at: new Date().toISOString() });
    }
    const result = await db.from('exam_bank_questions').update(values).eq('id', draft.id).eq('status', 'draft').eq('version', body.version).select('id');
    if (result.error?.code === '23505') return NextResponse.json({ error: 'La imagen ya fue aprobada en otro borrador.' }, { status: 409 });
    if (result.error || !result.data?.length) return NextResponse.json({ error: 'No se pudo guardar; actualiza la página para comprobar su estado.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo preparar la pregunta.' }, { status: 400 }); }
}
