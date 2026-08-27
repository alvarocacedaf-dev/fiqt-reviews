import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip',
]);

function safeFileName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '';
  const base = name
    .slice(0, extension ? -extension.length : undefined)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'plancha';
  return `${base}${extension}`;
}

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const body = await request.json() as { courseId?: string; fileName?: string; fileSize?: number };
    const courseId = body.courseId?.trim();
    const fileName = body.fileName?.trim();
    const fileSize = Number(body.fileSize);
    const extension = fileName?.includes('.') ? `.${fileName.split('.').pop()!.toLowerCase()}` : '';

    if (!courseId || !fileName || !Number.isSafeInteger(fileSize) || fileSize < 1) {
      return NextResponse.json({ error: 'Los datos del archivo no son válidos.' }, { status: 400 });
    }
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: `El formato de “${fileName}” no está permitido.` }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `“${fileName}” supera el límite de 100 MB.` }, { status: 400 });
    }

    const { data: course } = await context.db.from('courses').select('id').eq('id', courseId).maybeSingle();
    if (!course) return NextResponse.json({ error: 'El curso seleccionado no existe.' }, { status: 400 });

    const { error: rateLimitError } = await context.db.rpc('consume_action_rate_limit', {
      p_action: 'worksheet_upload_url',
    });
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError.message }, { status: 429 });
    }

    const key = `admin-worksheets/${courseId}/${context.user.id}/${randomUUID()}-${safeFileName(fileName)}`;
    return NextResponse.json({ key, uploadUrl: createR2PresignedUrl('PUT', key, 900) });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo preparar la subida a R2.',
    }, { status: 500 });
  }
}
