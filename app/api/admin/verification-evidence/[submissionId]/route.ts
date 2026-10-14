import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';

export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    if (context.status === 401) {
      return NextResponse.redirect(new URL('/login?next=/admin/verificaciones', request.url));
    }
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { submissionId } = await params;
  const { data: submission } = await context.db
    .from('verification_submissions')
    .select('file_url')
    .eq('id', submissionId)
    .maybeSingle();
  if (!submission?.file_url) {
    return NextResponse.json({ error: 'Evidencia no encontrada.' }, { status: 404 });
  }

  const { data, error } = await context.db.storage
    .from('verification-evidence')
    .createSignedUrl(submission.file_url, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'La evidencia no está disponible.' }, { status: 503 });
  }

  return NextResponse.redirect(data.signedUrl);
}
