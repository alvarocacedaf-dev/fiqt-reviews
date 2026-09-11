import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { getYouTubeVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const body = await request.json() as { courseId?: string; title?: string; academicTerm?: string; youtubeUrl?: string };
    const courseId = body.courseId?.trim() ?? '';
    const title = body.title?.trim() ?? '';
    const videoId = getYouTubeVideoId(body.youtubeUrl ?? '');
    if (!courseId || !title || title.length > 160 || !videoId) {
      return NextResponse.json({ error: 'Selecciona un curso, escribe un título y pega un enlace válido de YouTube.' }, { status: 400 });
    }

    const { data: course } = await context.db.from('courses').select('id').eq('id', courseId).maybeSingle();
    if (!course) return NextResponse.json({ error: 'El curso seleccionado no existe.' }, { status: 400 });
    const { error: rateLimitError } = await context.db.rpc('consume_action_rate_limit', { p_action: 'course_material_upload_confirm' });
    if (rateLimitError) return NextResponse.json({ error: rateLimitError.message }, { status: 429 });

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { error } = await context.db.from('course_materials').insert({
      course_id: courseId,
      title,
      material_type: 'videos',
      academic_term: body.academicTerm?.trim().slice(0, 20) || null,
      file_path: canonicalUrl,
      file_name: `youtube-${videoId}`,
      mime_type: 'text/uri-list',
      file_size: 1,
      uploaded_by: context.user.id,
      storage_provider: 'youtube',
    });
    if (error?.code === '23505') return NextResponse.json({ error: 'Este video de YouTube ya fue agregado.' }, { status: 409 });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar el video de YouTube.' }, { status: 500 });
  }
}
