import { NextResponse } from 'next/server';
import { createR2PresignedUrl, deleteR2Object } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isWorksheetExamTypeAllowed } from '@/lib/worksheetCategoryRules';
import { validateWorksheetFileName } from '@/lib/worksheetFileNaming';

export const runtime = 'nodejs';

type ConfirmBody = { courseId?: string; title?: string; examType?: string; academicTerm?: string; key?: string; fileName?: string; mimeType?: string; fileSize?: number };

export async function POST(request: Request) {
  let key = '';
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión para donar planchas.' }, { status: 401 });
    const body = await request.json() as ConfirmBody;
    const courseId = body.courseId?.trim() ?? '';
    key = body.key?.trim() ?? '';
    const fileSize = Number(body.fileSize);
    if (!courseId || !key.startsWith(`admin-worksheets/${courseId}/${user.id}/`) || !body.fileName || !body.title?.trim() || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'No se pudo validar el archivo donado.' }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { data: course } = await adminDb.from('courses').select('code,name').eq('id', courseId).maybeSingle();
    if (!course || !isWorksheetExamTypeAllowed(course.code, body.examType ?? '')) return NextResponse.json({ error: 'El curso o tipo de evaluación no es válido.' }, { status: 400 });
    const namingError = validateWorksheetFileName({
      fileName: body.fileName,
      examType: body.examType ?? '',
      courseName: course.name,
      academicTerm: body.academicTerm ?? '',
    });
    if (namingError) {
      await deleteR2Object(key).catch(() => undefined);
      key = '';
      return NextResponse.json({ error: namingError }, { status: 400 });
    }
    const uploadedObject = await fetch(createR2PresignedUrl('HEAD', key, 300), { method: 'HEAD' });
    if (!uploadedObject.ok || Number(uploadedObject.headers.get('content-length')) !== fileSize) throw new Error('No se confirmó la carga completa del archivo.');

    const { error } = await adminDb.from('worksheet_donations').insert({
      user_id: user.id,
      course_id: courseId,
      title: body.title.trim().slice(0, 160),
      exam_type: body.examType,
      academic_term: body.academicTerm?.trim().slice(0, 20) || null,
      file_path: key,
      file_name: body.fileName,
      mime_type: body.mimeType || null,
      file_size: fileSize,
      status: 'pending',
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, message: 'La plancha fue enviada para revisión.' });
  } catch (error) {
    if (key) await deleteR2Object(key).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la donación.' }, { status: 500 });
  }
}
