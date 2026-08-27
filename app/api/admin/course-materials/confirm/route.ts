import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createB2PresignedUrl, deleteB2Object } from '@/lib/b2';

export const runtime = 'nodejs';
const MATERIAL_TYPES = new Set(['books', 'guided_practice', 'classes', 'other']);

type ConfirmBody = { courseId?: string; title?: string; materialType?: string; academicTerm?: string; key?: string; fileName?: string; mimeType?: string; fileSize?: number };

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  let key = '';
  try {
    const body = await request.json() as ConfirmBody;
    const courseId = body.courseId?.trim() ?? '';
    key = body.key?.trim() ?? '';
    const fileSize = Number(body.fileSize);
    const expectedPrefix = `course-materials/${courseId}/${context.user.id}/`;
    if (!courseId || !key.startsWith(expectedPrefix) || !body.fileName || !body.title?.trim() || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'No se pudo validar el archivo subido.' }, { status: 400 });
    }
    if (!MATERIAL_TYPES.has(body.materialType ?? '')) return NextResponse.json({ error: 'El tipo de material no es válido.' }, { status: 400 });

    const { error: rateLimitError } = await context.db.rpc('consume_action_rate_limit', { p_action: 'worksheet_upload_confirm' });
    if (rateLimitError) return NextResponse.json({ error: rateLimitError.message }, { status: 429 });
    const uploadedObject = await fetch(createB2PresignedUrl('HEAD', key, 300), { method: 'HEAD' });
    const uploadedSize = Number(uploadedObject.headers.get('content-length'));
    if (!uploadedObject.ok || uploadedSize !== fileSize) throw new Error('Backblaze B2 no confirmó que el archivo se haya subido completamente.');

    const { error } = await context.db.from('course_materials').insert({
      course_id: courseId,
      title: body.title.trim().slice(0, 160),
      material_type: body.materialType,
      academic_term: body.academicTerm?.trim().slice(0, 20) || null,
      file_path: key,
      file_name: body.fileName,
      mime_type: body.mimeType || null,
      file_size: fileSize,
      uploaded_by: context.user.id,
      storage_provider: 'b2',
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (key) await deleteB2Object(key).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar el archivo.' }, { status: 500 });
  }
}
