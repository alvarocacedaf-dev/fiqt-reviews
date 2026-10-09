import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';
import { getRewardProgress } from '@/lib/rewardProgress';

export const runtime = 'nodejs';

function attachmentHeader(fileName: string) {
  const safeName = fileName.replace(/[\r\n]/g, '').trim() || 'archivo';
  const asciiName = safeName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function visibleDownloadName(title: string, storedFileName: string) {
  const extension = storedFileName.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] ?? '';
  if (!extension || title.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase())) return title;
  return `${title}${extension.toLocaleLowerCase()}`;
}

async function downloadResponse(url: string, fileName: string, mimeType: string | null) {
  const source = await fetch(url, { cache: 'no-store' });
  if (!source.ok || !source.body) {
    return NextResponse.json({ error: 'El archivo no está disponible.' }, { status: 503 });
  }

  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': attachmentHeader(fileName),
    'Content-Type': mimeType || source.headers.get('content-type') || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  const contentLength = source.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(source.body, { status: 200, headers });
}

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/planchas-administracion', _request.url));

  const adminDb = createAdminClient();
  const [{ data: profile }, rewardProgress, { data: file }] = await Promise.all([
    adminDb.from('profiles').select('role').eq('id', user.id).single(),
    getRewardProgress(user.id),
    adminDb.from('admin_worksheets').select('id,course_id,file_path,file_name,title,mime_type,storage_provider').eq('id', fileId).single(),
  ]);

  if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
  const approvedReviews = rewardProgress.total;
  let canDownload = profile?.role === 'owner' || approvedReviews >= REWARD_THRESHOLDS.allAdminCourses;

  if (!canDownload && approvedReviews >= REWARD_THRESHOLDS.oneAdminCourse) {
    const { data: unlock } = await adminDb
      .from('admin_worksheet_course_unlocks')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('course_id', file.course_id)
      .maybeSingle();
    canDownload = Boolean(unlock);
  }

  if (!canDownload) {
    return NextResponse.json({ error: 'Este curso todavía no está habilitado en tu ruta de recompensas.' }, { status: 403 });
  }

  if (file.storage_provider === 'r2') {
    if (!isR2Configured()) return NextResponse.json({ error: 'El archivo no está disponible.' }, { status: 503 });
    return downloadResponse(
      createR2PresignedUrl('GET', file.file_path, 300),
      visibleDownloadName(file.title, file.file_name),
      file.mime_type,
    );
  }

  const { data, error } = await adminDb.storage.from('admin-worksheets').createSignedUrl(file.file_path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'El archivo no está disponible.' }, { status: 503 });
  return downloadResponse(data.signedUrl, visibleDownloadName(file.title, file.file_name), file.mime_type);
}
