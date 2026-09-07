import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ donationId: string }> }) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.redirect(new URL('/login', request.url));
  const { donationId } = await params;
  const { data } = await context.db.from('worksheet_donations').select('file_path').eq('id', donationId).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Donación no encontrada.' }, { status: 404 });
  return NextResponse.redirect(createR2PresignedUrl('GET', data.file_path, 300));
}
