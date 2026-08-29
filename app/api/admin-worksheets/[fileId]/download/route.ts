import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/planchas-administracion', _request.url));

  const adminDb = createAdminClient();
  const [{ data: profile }, { count }, { data: file }] = await Promise.all([
    adminDb.from('profiles').select('role').eq('id', user.id).single(),
    adminDb.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
    adminDb.from('admin_worksheets').select('id,course_id,file_path,storage_provider').eq('id', fileId).single(),
  ]);

  if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
  const approvedReviews = count ?? 0;
  let canDownload = profile?.role === 'admin' || approvedReviews >= 24;

  if (!canDownload && approvedReviews >= 6) {
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
    return NextResponse.redirect(createR2PresignedUrl('GET', file.file_path, 300));
  }

  const { data, error } = await adminDb.storage.from('admin-worksheets').createSignedUrl(file.file_path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'El archivo no está disponible.' }, { status: 503 });
  return NextResponse.redirect(data.signedUrl);
}
