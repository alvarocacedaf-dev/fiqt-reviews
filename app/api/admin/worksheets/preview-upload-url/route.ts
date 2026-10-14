import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function safeFileName(name: string) {
  const base = name
    .replace(/\.pdf$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'vista-previa';
  return `${base}.pdf`;
}

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!context.isOwner) {
    return NextResponse.json({ error: 'Solo el propietario puede cargar vistas previas.' }, { status: 403 });
  }

  try {
    const body = await request.json() as { fileId?: string; fileName?: string; fileSize?: number };
    const fileId = body.fileId?.trim() ?? '';
    const fileName = body.fileName?.trim() ?? '';
    const fileSize = Number(body.fileSize);
    if (
      !fileId
      || !/\.pdf$/i.test(fileName)
      || !Number.isSafeInteger(fileSize)
      || fileSize < 1
      || fileSize > MAX_FILE_SIZE
    ) {
      return NextResponse.json({ error: 'Los datos del PDF no son válidos.' }, { status: 400 });
    }

    const { data: worksheet } = await context.db
      .from('admin_worksheets')
      .select('id,course_id,file_name')
      .eq('id', fileId)
      .maybeSingle();
    if (!worksheet) return NextResponse.json({ error: 'La plancha no existe.' }, { status: 404 });
    if (!/\.docx$/i.test(worksheet.file_name)) {
      return NextResponse.json({ error: 'Solo se admiten vistas previas para archivos .docx.' }, { status: 400 });
    }

    const key = `admin-worksheet-previews/${worksheet.course_id}/${worksheet.id}/${randomUUID()}-${safeFileName(fileName)}`;
    return NextResponse.json({ key, uploadUrl: createR2PresignedUrl('PUT', key, 900) });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo preparar la subida del PDF.',
    }, { status: 500 });
  }
}
