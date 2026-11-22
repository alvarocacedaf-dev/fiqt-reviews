import { NextResponse } from 'next/server';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { physicsPracticeBank } from '@/lib/examQuestionBank';
import { createAdminClient } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const bank = physicsPracticeBank(request);
  const access = await physicsExamAccess();
  if (access !== 200) return new Response(null, { status: access });
  const id = new URL(request.url).searchParams.get('id');
  const q = bank.questions.find(q => q.id === id && q.status === 'reviewed');
  if (!q) return new Response(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from('admin-worksheets').download(q.assetPath);
  if (error || !data) return NextResponse.json({ error: 'No se pudo cargar la pregunta.' }, { status: 503 });
  return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
