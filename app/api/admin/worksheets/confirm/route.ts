import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl, deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';

type ConfirmBody = {
  courseId?: string;
  title?: string;
  examType?: string;
  academicTerm?: string;
  key?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

const EXAM_TYPES = new Set(['practice', 'midterm', 'final', 'substitute', 'quiz', 'other']);

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  let key = '';
  try {
    const body = await request.json() as ConfirmBody;
    const courseId = body.courseId?.trim() ?? '';
    key = body.key?.trim() ?? '';
    const fileSize = Number(body.fileSize);
    const expectedPrefix = `admin-worksheets/${courseId}/${context.user.id}/`;
    if (
      !courseId
      || !key.startsWith(expectedPrefix)
      || !body.fileName
      || !body.title?.trim()
      || !Number.isSafeInteger(fileSize)
      || fileSize < 1
      || fileSize > 100 * 1024 * 1024
    ) {
      return NextResponse.json({ error: 'No se pudo validar el archivo subido.' }, { status: 400 });
    }
    if (!EXAM_TYPES.has(body.examType ?? '')) {
      return NextResponse.json({ error: 'El tipo de evaluación no es válido.' }, { status: 400 });
    }

    const { error: rateLimitError } = await context.db.rpc('consume_action_rate_limit', {
      p_action: 'worksheet_upload_confirm',
    });
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError.message }, { status: 429 });
    }

    const uploadedObject = await fetch(createR2PresignedUrl('HEAD', key, 300), { method: 'HEAD' });
    const uploadedSize = Number(uploadedObject.headers.get('content-length'));
    if (!uploadedObject.ok || uploadedSize !== fileSize) {
      throw new Error('R2 no confirmó que el archivo se haya subido completamente.');
    }

    const { error } = await context.db.from('admin_worksheets').insert({
      course_id: courseId,
      title: body.title.trim().slice(0, 160),
      exam_type: body.examType,
      academic_term: body.academicTerm?.trim().slice(0, 20) || null,
      file_path: key,
      file_name: body.fileName,
      mime_type: body.mimeType || null,
      file_size: fileSize,
      uploaded_by: context.user.id,
      storage_provider: 'r2',
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (key) await deleteR2Object(key).catch(() => undefined);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo registrar el archivo.',
    }, { status: 500 });
  }
}
