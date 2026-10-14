import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl, deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';

type ConfirmBody = {
  fileId?: string;
  key?: string;
  fileName?: string;
  fileSize?: number;
};

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!context.isOwner) {
    return NextResponse.json({ error: 'Solo el propietario puede asociar vistas previas.' }, { status: 403 });
  }

  let uploadedKey = '';
  try {
    const body = await request.json() as ConfirmBody;
    const fileId = body.fileId?.trim() ?? '';
    uploadedKey = body.key?.trim() ?? '';
    const fileName = body.fileName?.trim() ?? '';
    const fileSize = Number(body.fileSize);
    if (!fileId || !uploadedKey || !/\.pdf$/i.test(fileName) || !Number.isSafeInteger(fileSize) || fileSize < 1) {
      return NextResponse.json({ error: 'No se pudo validar el PDF subido.' }, { status: 400 });
    }

    const { data: worksheet } = await context.db
      .from('admin_worksheets')
      .select('id,course_id,file_name,preview_file_path,preview_storage_provider')
      .eq('id', fileId)
      .maybeSingle();
    if (!worksheet) return NextResponse.json({ error: 'La plancha no existe.' }, { status: 404 });
    if (!/\.docx$/i.test(worksheet.file_name)) {
      return NextResponse.json({ error: 'El archivo original no es .docx.' }, { status: 400 });
    }
    const expectedPrefix = `admin-worksheet-previews/${worksheet.course_id}/${worksheet.id}/`;
    if (!uploadedKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'La ruta del PDF no corresponde a esta plancha.' }, { status: 400 });
    }

    const uploadedObject = await fetch(createR2PresignedUrl('HEAD', uploadedKey, 300), { method: 'HEAD' });
    const uploadedSize = Number(uploadedObject.headers.get('content-length'));
    if (!uploadedObject.ok || uploadedSize !== fileSize) {
      throw new Error('R2 no confirmó que el PDF se haya subido completamente.');
    }

    const previousKey = worksheet.preview_storage_provider === 'r2' ? worksheet.preview_file_path : null;
    const { error } = await context.db
      .from('admin_worksheets')
      .update({
        preview_file_path: uploadedKey,
        preview_file_name: fileName,
        preview_mime_type: 'application/pdf',
        preview_file_size: fileSize,
        preview_storage_provider: 'r2',
      })
      .eq('id', worksheet.id);
    if (error) throw new Error(error.message);

    if (previousKey && previousKey !== uploadedKey) {
      await deleteR2Object(previousKey).catch(() => undefined);
    }
    uploadedKey = '';
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (uploadedKey) await deleteR2Object(uploadedKey).catch(() => undefined);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo asociar el PDF.',
    }, { status: 500 });
  }
}
