import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createB2PresignedUrl } from '@/lib/b2';
import { createR2PresignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// Match the materials page's signed-in access policy. Never proxy large video bodies.
export async function GET(_request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const noCache = { 'Cache-Control': 'private, no-store' };
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inicia sesión para reproducir el video.' }, { status: 401, headers: noCache });
    const { materialId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(materialId)) return NextResponse.json({ error: 'Video no válido.' }, { status: 400, headers: noCache });
    const { data: file, error } = await createAdminClient().from('course_materials')
      .select('file_path,storage_provider').eq('id', materialId).eq('material_type', 'videos').maybeSingle();
    if (error) throw error;
    if (!file || !['b2', 'r2'].includes(file.storage_provider)) return NextResponse.json({ error: 'Video no disponible.' }, { status: 404, headers: noCache });
    const url = file.storage_provider === 'b2'
      ? createB2PresignedUrl('GET', file.file_path, 14400)
      : createR2PresignedUrl('GET', file.file_path, 14400);
    return new NextResponse(null, { status: 307, headers: { ...noCache, Location: url } });
  } catch {
    return NextResponse.json({ error: 'No se pudo abrir el video. Inténtalo nuevamente.' }, { status: 503, headers: noCache });
  }
}
