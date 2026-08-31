import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';
import { createStoredZipStream } from '@/lib/zipStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXAM_TYPES = new Set(['practice', 'midterm', 'final', 'substitute', 'quiz', 'other']);

function zipFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId')?.trim();
  const examType = searchParams.get('examType')?.trim();
  if (!courseId || !examType || !EXAM_TYPES.has(examType)) {
    return NextResponse.json({ error: 'La carpeta solicitada no es válida.' }, { status: 400 });
  }

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/planchas-administracion', request.url));

  const adminDb = createAdminClient();
  const [{ data: profile }, { count }, { data: course }] = await Promise.all([
    adminDb.from('profiles').select('role').eq('id', user.id).single(),
    adminDb.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
    adminDb.from('courses').select('code,name').eq('id', courseId).single(),
  ]);
  if (!course) return NextResponse.json({ error: 'Curso no encontrado.' }, { status: 404 });

  const approvedReviews = count ?? 0;
  let canDownload = profile?.role === 'admin' || approvedReviews >= REWARD_THRESHOLDS.allAdminCourses;
  if (!canDownload && approvedReviews >= REWARD_THRESHOLDS.oneAdminCourse) {
    const { data: unlock } = await adminDb
      .from('admin_worksheet_course_unlocks')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();
    canDownload = Boolean(unlock);
  }
  if (!canDownload) {
    return NextResponse.json({ error: 'Este curso todavía no está habilitado en tu ruta de recompensas.' }, { status: 403 });
  }

  const { data: rawFiles, error } = await adminDb
    .from('admin_worksheets')
    .select('id,file_name,file_path,storage_provider')
    .eq('course_id', courseId)
    .eq('exam_type', examType)
    .order('id');
  if (error) return NextResponse.json({ error: 'No se pudo preparar la carpeta.' }, { status: 500 });
  if (!rawFiles?.length) return NextResponse.json({ error: 'Esta carpeta está vacía.' }, { status: 404 });

  const sources = await Promise.all(rawFiles.map(async file => {
    if (file.storage_provider === 'r2') {
      if (!isR2Configured()) throw new Error('Uno de los archivos no está disponible.');
      return { name: file.file_name, url: createR2PresignedUrl('GET', file.file_path, 900) };
    }
    const { data, error: signedUrlError } = await adminDb.storage.from('admin-worksheets').createSignedUrl(file.file_path, 900);
    if (signedUrlError || !data?.signedUrl) throw new Error('Uno de los archivos no está disponible.');
    return { name: file.file_name, url: data.signedUrl };
  })).catch(() => null);
  if (!sources) return NextResponse.json({ error: 'No se pudo preparar uno de los archivos.' }, { status: 503 });

  const archiveName = `${zipFileName(course.code || course.name)}-${zipFileName(examType)}.zip`;
  return new Response(createStoredZipStream(sources), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${archiveName}"`,
      'Content-Type': 'application/zip',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
