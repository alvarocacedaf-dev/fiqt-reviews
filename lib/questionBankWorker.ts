import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createR2PresignedUrl } from '@/lib/r2';
import { openExamDocument } from '@/lib/questionBankExtractor';
import { suggestQuestions, type QuestionPage } from '@/lib/questionBankReview';

export async function processUploadedExam(worksheetId: string) {
  const { data, error } = await createAdminClient().from('exam_bank_jobs').select('id').eq('worksheet_id', worksheetId).maybeSingle();
  if (error) { console.error('exam_bank_enqueue_lookup_failed', error.code); return; }
  if (data) await processExamBankQueue(data.id);
}

export async function processExamBankQueue(id?: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('claim_exam_bank_job', { p_id: id ?? null });
  if (error) { console.error('exam_bank_claim_failed', error.code); return; }
  const job = data?.[0];
  if (!job) return;
  const update = async (values: Record<string, unknown>) => {
    const result = await db.from('exam_bank_jobs').update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', job.id).eq('lease_token', job.lease_token).select('id');
    if (result.error || !result.data?.length) throw new Error('Se perdió la reserva del procesamiento.');
  };
  let document: Awaited<ReturnType<typeof openExamDocument>> | undefined;
  try {
    const { data: source, error: sourceError } = await db.from('admin_worksheets').select('*').eq('id', job.worksheet_id).single();
    if (sourceError || !source) throw new Error('No se encontró el examen original.');
    const isWord = /\.docx?$/i.test(source.file_name);
    if (isWord && !source.preview_file_path) {
      await update({ status: 'waiting_pdf', warning: 'Asocia un PDF de este Word en Administrar planchas. Se procesará automáticamente al añadirlo.', lease_until: null });
      return;
    }
    const key = isWord ? source.preview_file_path : source.file_path;
    const provider = isWord ? source.preview_storage_provider : source.storage_provider;
    let bytes: Uint8Array;
    if (provider === 'r2') {
      const response = await fetch(createR2PresignedUrl('GET', key, 300), { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('No se pudo descargar el original del almacenamiento.');
      bytes = new Uint8Array(await response.arrayBuffer());
    } else if (!provider || provider === 'supabase') {
      const result = await db.storage.from('admin-worksheets').download(key);
      if (result.error || !result.data) throw new Error('No se pudo descargar el original.');
      bytes = new Uint8Array(await result.data.arrayBuffer());
    } else throw new Error('Este almacenamiento requiere importar primero el archivo a Administrar planchas.');
    if (bytes.length > 100 * 1024 * 1024) throw new Error('El documento supera 100 MB.');
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (job.source_hash && job.source_hash !== hash) throw new Error('El documento cambió durante el procesamiento. Revisa el original.');
    const duplicate = await db.from('exam_bank_jobs').select('id').eq('bank_key', job.bank_key).eq('source_hash', hash).neq('id', job.id).limit(1);
    let warning = /solucion|solución|resuelt/i.test(source.title) ? 'Contiene o podría contener soluciones: recorta únicamente enunciados completos y sus figuras.' : '';
    if (duplicate.data?.length) warning += ' Este archivo coincide exactamente con otro examen procesado. Revisa los duplicados antes de aprobar.';
    document = await openExamDocument(bytes, isWord || bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70);
    const pages: QuestionPage[] = job.pages;
    await update({ source_hash: hash, page_count: document.pageCount, warning });
    const deadline = Date.now() + 180000;
    for (let number = pages.length + 1; number <= document.pageCount; number++) {
      if (Date.now() > deadline) { await update({ status: 'queued', lease_until: null }); return; }
      const page = await document.page(number);
      const path = `question-bank/review/${job.id}/${hash}/page-${number}.jpg`;
      const upload = await db.storage.from('admin-worksheets').upload(path, page.bytes, { contentType: 'image/jpeg', upsert: true });
      if (upload.error) throw new Error('No se pudo guardar una página procesada.');
      pages.push({ page: number, width: page.width, height: page.height, lines: page.lines, path });
      await update({ pages });
    }
    const suggestions = suggestQuestions(pages);
    if (suggestions.length) {
      const result = await db.from('exam_bank_questions').upsert(suggestions.map((q, index) => ({
        job_id: job.id, bank_key: job.bank_key, ordinal: index + 1, regions: q.regions, extracted_text: q.text,
      })), { onConflict: 'job_id,ordinal', ignoreDuplicates: true });
      if (result.error) throw new Error('No se pudieron guardar los borradores.');
    } else warning += ' No se detectaron números de pregunta. Puedes crear los recortes manualmente usando las páginas procesadas.';
    await update({ status: 'review', warning, lease_until: null });
  } catch (error) {
    await update({ status: 'failed', error: error instanceof Error ? error.message : 'No se pudo procesar el documento.', lease_until: null }).catch(() => undefined);
  } finally { await document?.close(); }
}
